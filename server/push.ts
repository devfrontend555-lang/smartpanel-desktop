import crypto from "crypto";
import { Pool } from "pg";
import webpush from "web-push";
import { resilientFetch } from "./resilience";

const PRAYER_KEYS = ["Bomdod", "Quyosh", "Peshin", "Asr", "Shom", "Xufton"];
const sessionSecret = process.env.SESSION_SECRET;
const subject = process.env.VAPID_SUBJECT || "mailto:push@smartpanel.local";
const pushEnabled = Boolean(sessionSecret);

let publicKey = "";
let privateKey = "";

if (sessionSecret) {
  // Derive a stable P-256 key from the existing server secret. This keeps
  // subscriptions valid across restarts without exposing a private key.
  const derivedPrivate = crypto
    .createHash("sha256")
    .update(`smartpanel-vapid:${sessionSecret}`)
    .digest();
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(derivedPrivate);
  privateKey = derivedPrivate.toString("base64url");
  publicKey = ecdh.getPublicKey().toString("base64url");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
  city: string;
  prayers: string[];
}

const memorySubscriptions = new Map<string, StoredPushSubscription>();
const memoryDeliveries = new Set<string>();
const sharedDatabaseUrl = process.env.NODE_ENV === "test"
  ? undefined
  : process.env.SHARED_CACHE_DATABASE_URL || process.env.DATABASE_URL;
const sharedPool = sharedDatabaseUrl
  ? new Pool({ connectionString: sharedDatabaseUrl, max: 3 })
  : null;
let sharedSchemaReady: Promise<boolean> | null = null;
let sharedStoreUnavailable = false;

async function sharedReady(): Promise<boolean> {
  if (!sharedPool || sharedStoreUnavailable) return false;
  if (!sharedSchemaReady) {
    sharedSchemaReady = (async () => {
      try {
        await sharedPool.query(`
          CREATE TABLE IF NOT EXISTS smartpanel_push_subscriptions (
            endpoint TEXT PRIMARY KEY,
            expiration_time BIGINT,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            city TEXT NOT NULL,
            prayers TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS smartpanel_push_deliveries (
            delivery_key TEXT PRIMARY KEY,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        return true;
      } catch (error) {
        sharedStoreUnavailable = true;
        console.warn(`[push] shared subscription store unavailable: ${(error as Error).message}`);
        return false;
      }
    })();
  }
  return sharedSchemaReady;
}

export function pushConfig() {
  return {
    enabled: pushEnabled,
    publicKey: pushEnabled ? publicKey : null,
  };
}

function validSubscription(value: unknown): value is Omit<StoredPushSubscription, "city" | "prayers"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredPushSubscription>;
  return (
    typeof candidate.endpoint === "string" &&
    candidate.endpoint.startsWith("https://") &&
    candidate.endpoint.length <= 2048 &&
    typeof candidate.keys?.p256dh === "string" &&
    candidate.keys.p256dh.length <= 256 &&
    typeof candidate.keys?.auth === "string" &&
    candidate.keys.auth.length <= 256
  );
}

export async function savePushSubscription(
  subscription: unknown,
  city: string,
  prayers: string[],
): Promise<void> {
  if (!pushEnabled || !validSubscription(subscription)) {
    throw new Error("Web Push is not configured or subscription is invalid");
  }
  const candidate = subscription as Omit<StoredPushSubscription, "city" | "prayers">;
  const safeCity = city.trim().slice(0, 120) || "Toshkent";
  const safePrayers = PRAYER_KEYS.filter(key => prayers.includes(key));
  const stored = { ...candidate, city: safeCity, prayers: safePrayers };
  memorySubscriptions.set(stored.endpoint, stored);

  if (await sharedReady()) {
    try {
      await sharedPool!.query(
        `INSERT INTO smartpanel_push_subscriptions
          (endpoint, expiration_time, p256dh, auth, city, prayers, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (endpoint) DO UPDATE SET
          expiration_time = EXCLUDED.expiration_time,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          city = EXCLUDED.city,
          prayers = EXCLUDED.prayers,
          updated_at = NOW()`,
        [
          stored.endpoint,
          stored.expirationTime ?? null,
          stored.keys.p256dh,
          stored.keys.auth,
          stored.city,
          JSON.stringify(stored.prayers),
        ],
      );
    } catch (error) {
      sharedStoreUnavailable = true;
      console.warn(`[push] subscription persistence failed; using memory: ${(error as Error).message}`);
    }
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  memorySubscriptions.delete(endpoint);
  if (await sharedReady()) {
    try {
      await sharedPool!.query(
        "DELETE FROM smartpanel_push_subscriptions WHERE endpoint = $1",
        [endpoint],
      );
    } catch (error) {
      sharedStoreUnavailable = true;
      console.warn(`[push] subscription removal failed: ${(error as Error).message}`);
    }
  }
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const subscriptions = new Map(memorySubscriptions);
  if (await sharedReady()) {
    try {
      const result = await sharedPool!.query(
        "SELECT endpoint, expiration_time, p256dh, auth, city, prayers FROM smartpanel_push_subscriptions",
      );
      for (const row of result.rows) {
        subscriptions.set(row.endpoint, {
          endpoint: row.endpoint,
          expirationTime: row.expiration_time ? Number(row.expiration_time) : null,
          keys: { p256dh: row.p256dh, auth: row.auth },
          city: row.city,
          prayers: JSON.parse(row.prayers),
        });
      }
    } catch (error) {
      sharedStoreUnavailable = true;
      console.warn(`[push] subscription read failed; using memory: ${(error as Error).message}`);
    }
  }
  return Array.from(subscriptions.values());
}

async function claimDelivery(key: string): Promise<boolean> {
  if (memoryDeliveries.has(key)) return false;
  memoryDeliveries.add(key);
  if (await sharedReady()) {
    try {
      const result = await sharedPool!.query(
        `INSERT INTO smartpanel_push_deliveries (delivery_key)
         VALUES ($1) ON CONFLICT DO NOTHING RETURNING delivery_key`,
        [key],
      );
      if (result.rowCount === 0) {
        memoryDeliveries.delete(key);
        return false;
      }
    } catch (error) {
      sharedStoreUnavailable = true;
      console.warn(`[push] delivery claim failed; using memory: ${(error as Error).message}`);
    }
  }
  return true;
}

async function releaseDelivery(key: string): Promise<void> {
  memoryDeliveries.delete(key);
  if (await sharedReady()) {
    try {
      await sharedPool!.query(
        "DELETE FROM smartpanel_push_deliveries WHERE delivery_key = $1",
        [key],
      );
    } catch (error) {
      sharedStoreUnavailable = true;
      console.warn(`[push] delivery release failed: ${(error as Error).message}`);
    }
  }
}

function localDateTime(timeZone: string): { date: string; time: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value || "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}

async function sendDueNotifications(port: number): Promise<void> {
  if (!pushEnabled) return;
  const subscriptions = await listPushSubscriptions();
  if (!subscriptions.length) return;

  const cityMap = new Map<string, Promise<any>>();
  for (const subscription of subscriptions) {
    if (!cityMap.has(subscription.city)) {
      cityMap.set(
        subscription.city,
        resilientFetch(
          `http://127.0.0.1:${port}/api/prayer?city=${encodeURIComponent(subscription.city)}`,
          { headers: { "X-SmartPanel-Internal": "push" } },
          { timeoutMs: 20_000, retries: 1 },
        ).then(response => response.json()).catch(() => null),
      );
    }
  }
  const prayerByCity = new Map<string, any>();
  for (const [city, promise] of cityMap) prayerByCity.set(city, await promise);

  for (const subscription of subscriptions) {
    const prayer = prayerByCity.get(subscription.city);
    if (!prayer?.timings || !prayer.timezone) continue;
    const local = localDateTime(prayer.timezone);
    for (const key of subscription.prayers) {
      if (prayer.timings[key]?.slice(0, 5) !== local.time) continue;
      const deliveryKey = `${crypto.createHash("sha256").update(subscription.endpoint).digest("hex")}:${local.date}:${key}`;
      if (!(await claimDelivery(deliveryKey))) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
          },
          JSON.stringify({
            title: `🕌 ${key} namozi`,
            body: `${prayer.timings[key].slice(0, 5)} — Alloh qabul qilsin!`,
            icon: "/favicon.png",
            badge: "/favicon.png",
            tag: `prayer-${key}`,
            data: { url: "/?tab=3" },
          }),
          { TTL: 3600, urgency: "high" },
        );
      } catch (error: any) {
        await releaseDelivery(deliveryKey);
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await removePushSubscription(subscription.endpoint);
        } else {
          console.warn(`[push] ${key} delivery failed: ${error?.message || "unknown error"}`);
        }
      }
    }
  }
}

let schedulerStarted = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startPushScheduler(port: number): void {
  if (!pushEnabled || schedulerStarted) return;
  schedulerStarted = true;
  schedulerTimer = setInterval(() => {
    sendDueNotifications(port).catch(error => {
      console.warn(`[push] scheduler failed: ${(error as Error).message}`);
    });
  }, 20_000);
  schedulerTimer.unref();
  console.log("[push] prayer notification scheduler started");
}

export async function pushStats() {
  let subscriptions = 0;
  try {
    subscriptions = (await listPushSubscriptions()).length;
  } catch (error) {
    console.warn(`[push] health read failed: ${(error as Error).message}`);
    subscriptions = memorySubscriptions.size;
  }
  return {
    enabled: pushEnabled,
    subscriptions,
    scheduler: schedulerStarted,
    storage: sharedPool
      ? sharedStoreUnavailable ? "memory (shared store unavailable)" : "postgresql"
      : "memory (shared store not configured)",
  };
}