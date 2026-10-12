/**
 * SmartPanel Server Cache Layer
 * ─────────────────────────────
 * • TTL-based in-memory cache for API responses
 * • Inflight request coalescing (same key → shared promise)
 * • Simple IP-based rate limiter
 * • Disk-backed audio file cache
 */
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { Pool, type PoolClient } from "pg";
import { audioStorageStatus, downloadSharedAudio, uploadSharedAudio } from "./audio-storage";
import { resilientFetch } from "./resilience";

// ── TTL Cache ────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export class TtlCache {
  protected store = new Map<string, CacheEntry<any>>();
  protected inflights = new Map<string, Promise<any>>();
  private hitCount = 0;
  private missCount = 0;
  private staleHits = 0;
  private readonly maxEntries = 500;

  /** Get cached value, or undefined if missing/expired */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (now > entry.expiresAt) {
      if (now > entry.staleUntil) this.store.delete(key);
      return undefined;
    }
    this.hitCount++;
    return entry.value as T;
  }

  /** Set a value with TTL in seconds */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.missCount++;
    this.remember(key, value, ttlSeconds);
  }

  protected remember<T>(key: string, value: T, ttlSeconds: number, staleGraceSeconds = 900): void {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.store.delete(oldestKey);
    }
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, {
      value,
      expiresAt,
      staleUntil: expiresAt + staleGraceSeconds * 1000,
    });
  }

  /** Return an expired value during the short stale-if-error window. */
  protected getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (now <= entry.expiresAt || now > entry.staleUntil) {
      if (now > entry.staleUntil) this.store.delete(key);
      return undefined;
    }
    this.staleHits++;
    return entry.value as T;
  }

  /**
   * Coalescing fetch: if a request for `key` is already in-flight,
   * return the same promise instead of launching a new upstream call.
   * Caches the result on success.
   */
  async coalesce<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    // 1. Cache hit
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    // 2. Already in-flight for this key
    const inflight = this.inflights.get(key);
    if (inflight) return inflight as Promise<T>;

    // 3. Launch new upstream call
    const promise = fetcher().then(value => {
      this.set(key, value, ttlSeconds);
      this.inflights.delete(key);
      return value;
    }).catch(err => {
      const stale = this.getStale<T>(key);
      this.inflights.delete(key);
      if (stale !== undefined) return stale;
      throw err;
    });

    this.inflights.set(key, promise);
    return promise;
  }

  /** Remove all expired entries (call periodically) */
  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) { this.store.delete(key); removed++; }
    }
    return removed;
  }

  stats() {
    return {
      entries: this.store.size,
      inflights: this.inflights.size,
      hits: this.hitCount,
      misses: this.missCount,
      staleHits: this.staleHits,
      hitRate: this.hitCount + this.missCount === 0
        ? "0%"
        : `${Math.round(this.hitCount / (this.hitCount + this.missCount) * 100)}%`,
    };
  }

  backendStatus() {
    return "memory";
  }
}

/**
 * Cache with optional PostgreSQL coordination.
 *
 * PostgreSQL is used when a shared URL or Replit's managed DATABASE_URL is
 * configured. Unit tests explicitly use the process-local implementation.
 * An advisory transaction lock prevents two server instances from fetching
 * the same uncached upstream value at the same time.
 */
export class SharedTtlCache extends TtlCache {
  override async coalesce<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const localInflight = this.inflights.get(key);
    if (localInflight) return localInflight as Promise<T>;

    const promise = this.fetchWithSharedCoordination(key, ttlSeconds, fetcher)
      .then(value => {
        this.set(key, value, ttlSeconds);
        this.inflights.delete(key);
        return value;
      })
      .catch(error => {
        this.inflights.delete(key);
        throw error;
      });

    this.inflights.set(key, promise);
    return promise;
  }

  private async fetchWithSharedCoordination<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    if (!(await ensureSharedSchema()) || !sharedCachePool) {
      return fetcher();
    }

    let client: PoolClient | undefined;
    let upstreamStarted = false;
    try {
      client = await sharedCachePool.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);

      const result = await client.query(
        "SELECT value FROM smartpanel_api_cache WHERE cache_key = $1 AND expires_at > NOW()",
        [key],
      );
      if (result.rows.length > 0) {
        await client.query("COMMIT");
        return result.rows[0].value as T;
      }

      upstreamStarted = true;
      const value = await fetcher();
      await client.query(
        `INSERT INTO smartpanel_api_cache (cache_key, value, expires_at, stale_until)
         VALUES ($1, $2::jsonb,
           NOW() + ($3 * INTERVAL '1 second'),
           NOW() + (($3 + 900) * INTERVAL '1 second'))
         ON CONFLICT (cache_key) DO UPDATE
         SET value = EXCLUDED.value,
             expires_at = EXCLUDED.expires_at,
             stale_until = EXCLUDED.stale_until`,
        [key, JSON.stringify(value), ttlSeconds],
      );
      await client.query("COMMIT");
      return value;
    } catch (error) {
      if (upstreamStarted && client) {
        const stale = await client.query(
          "SELECT value FROM smartpanel_api_cache WHERE cache_key = $1 AND stale_until > NOW()",
          [key],
        ).catch(() => ({ rows: [] }));
        if (stale.rows.length > 0) {
          await client.query("COMMIT").catch(() => undefined);
          return stale.rows[0].value as T;
        }
      }
      if (client) await client.query("ROLLBACK").catch(() => undefined);
      // Do not repeat an upstream request that has already started.
      if (upstreamStarted) throw error;
      console.warn(`[cache] shared coordination failed; using local fetch: ${(error as Error).message}`);
      return fetcher();
    } finally {
      client?.release();
    }
  }

  override backendStatus() {
    if (!sharedCachePool) return "memory (shared backend not configured)";
    if (sharedSchemaUnavailable) return "memory (shared backend unavailable)";
    return "postgresql";
  }
}

// ── IP Rate Limiter ──────────────────────────────────────────────────────────
interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxTokens: number = 60,   // max requests per window
    private readonly windowMs: number = 60_000  // 1 minute
  ) {}

  /** Returns true if the request is allowed, false if rate-limited */
  async allow(ip: string): Promise<boolean> {
    if (await ensureSharedSchema() && sharedCachePool) {
      try {
        const windowStart = Math.floor(Date.now() / this.windowMs) * this.windowMs;
        const result = await sharedCachePool.query(
          `INSERT INTO smartpanel_rate_limits (bucket_key, window_start, request_count)
           VALUES ($1, $2, 1)
           ON CONFLICT (bucket_key) DO UPDATE
           SET request_count = CASE
             WHEN smartpanel_rate_limits.window_start = EXCLUDED.window_start
             THEN smartpanel_rate_limits.request_count + 1
             ELSE 1
           END,
           window_start = EXCLUDED.window_start
           RETURNING request_count`,
          [ip, windowStart],
        );
        return result.rows[0].request_count <= this.maxTokens;
      } catch (error) {
        console.warn(`[cache] shared rate limit failed; using local bucket: ${(error as Error).message}`);
      }
    }
    return this.allowLocal(ip);
  }

  private allowLocal(ip: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastRefill: now };
      this.buckets.set(ip, bucket);
      return true;
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor(elapsed / this.windowMs * this.maxTokens);
    if (refill > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) return false;
    bucket.tokens--;
    return true;
  }

  /** Clean up old buckets to prevent memory leak */
  purge(): void {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [ip, b] of this.buckets) {
      if (b.lastRefill < cutoff) this.buckets.delete(ip);
    }
  }
}

// ── Disk Audio Cache ─────────────────────────────────────────────────────────
// Prefer the explicit shared URL, but use Replit's managed DATABASE_URL when
// available so a second secret is not required for the built-in PostgreSQL.
const sharedDatabaseUrl = process.env.NODE_ENV === "test"
  ? undefined
  : process.env.SHARED_CACHE_DATABASE_URL || process.env.DATABASE_URL;
const sharedCachePool = sharedDatabaseUrl
  ? new Pool({
      connectionString: sharedDatabaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    })
  : null;

let sharedSchemaReady: Promise<boolean> | null = null;
let sharedSchemaUnavailable = false;

async function ensureSharedSchema(): Promise<boolean> {
  if (!sharedCachePool || sharedSchemaUnavailable) return false;
  if (!sharedSchemaReady) {
    sharedSchemaReady = sharedCachePool.query(`
      CREATE TABLE IF NOT EXISTS smartpanel_api_cache (
        cache_key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        stale_until TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE smartpanel_api_cache
        ADD COLUMN IF NOT EXISTS stale_until TIMESTAMPTZ NOT NULL DEFAULT NOW();
      CREATE TABLE IF NOT EXISTS smartpanel_rate_limits (
        bucket_key TEXT PRIMARY KEY,
        window_start BIGINT NOT NULL,
        request_count INTEGER NOT NULL
      );
    `).then(() => true).catch(error => {
      sharedSchemaUnavailable = true;
      console.warn(`[cache] shared backend unavailable: ${error.message}`);
      return false;
    });
  }
  return sharedSchemaReady;
}

const AUDIO_CACHE_DIR = "/tmp/smartpanel-audio";
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
if (!fs.existsSync(AUDIO_CACHE_DIR)) fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

const audioDiskInflight = new Map<string, Promise<string>>();

/**
 * Download audio once, cache to disk.
 * Returns local file path.
 */
export async function getAudioCached(id: string, url: string): Promise<string> {
  const filePath = path.join(AUDIO_CACHE_DIR, `${id}.audio`);
  const tempPath = `${filePath}.${process.pid}.tmp`;
  const objectName = `smartpanel-audio/${id}.audio`;

  // Already on disk?
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 0 && stat.size <= MAX_AUDIO_BYTES) return filePath;
    fs.rmSync(filePath, { force: true });
  }

  // Already downloading?
  const inFlight = audioDiskInflight.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    // Shared App Storage is the durable layer; local disk remains the fast
    // per-instance layer. A storage outage falls back to the upstream source.
    try {
      if (audioStorageStatus().startsWith("app-storage")) {
        const found = await downloadSharedAudio(objectName, tempPath);
        if (found) {
          const stat = fs.statSync(tempPath);
          if (stat.size > 0 && stat.size <= MAX_AUDIO_BYTES) {
            fs.renameSync(tempPath, filePath);
            return filePath;
          }
          fs.rmSync(tempPath, { force: true });
        }
      }
    } catch (error) {
      fs.rmSync(tempPath, { force: true });
      console.warn(`[audio] shared storage read failed; using upstream: ${(error as Error).message}`);
    }

    const res = await resilientFetch(url, {
      headers: { "User-Agent": "SmartPanel/4.0" },
    }, { timeoutMs: 30_000 });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const declaredLength = Number(res.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_AUDIO_BYTES) {
      throw new Error("Audio file is too large");
    }
    if (!res.body) throw new Error("Upstream returned an empty body");

    let bytes = 0;
    const limitedStream = Readable.fromWeb(res.body as any);
    limitedStream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_AUDIO_BYTES) {
        limitedStream.destroy(new Error("Audio file is too large"));
      }
    });
    await pipeline(limitedStream, fs.createWriteStream(tempPath, { flags: "wx" }));
    if (bytes === 0) throw new Error("Upstream returned an empty body");
    fs.renameSync(tempPath, filePath);
    try {
      if (audioStorageStatus().startsWith("app-storage")) {
        await uploadSharedAudio(objectName, filePath);
      }
    } catch (error) {
      // Local serving should not fail just because durable replication is
      // temporarily unavailable; the next instance can retry the upload.
      console.warn(`[audio] shared storage write failed: ${(error as Error).message}`);
    }
    audioDiskInflight.delete(id);
    return filePath;
  })().catch(err => {
    fs.rmSync(tempPath, { force: true });
    throw err;
  });

  audioDiskInflight.set(id, promise);
  promise.catch(() => audioDiskInflight.delete(id));
  return promise;
}

// ── Singleton instances ──────────────────────────────────────────────────────
export const apiCache   = new SharedTtlCache();
export const rateLimiter = new RateLimiter(80, 60_000); // 80 req/min per IP

// Periodic housekeeping every 5 minutes
const housekeepingTimer = setInterval(() => {
  const removed = apiCache.purgeExpired();
  rateLimiter.purge();
  if (removed > 0) console.log(`[cache] purged ${removed} expired entries`);
}, 5 * 60_000);
housekeepingTimer.unref();
