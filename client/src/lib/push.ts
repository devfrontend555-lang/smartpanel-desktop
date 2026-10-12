interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys?: { p256dh?: string; auth?: string };
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function syncPushSubscription(
  city: string,
  prayers: string[],
): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "Bu brauzer Web Push’ni qo‘llab-quvvatlamaydi" };
  }
  if (!window.isSecureContext) {
    return { ok: false, reason: "Web Push faqat xavfsiz HTTPS ulanishda ishlaydi" };
  }

  const configResponse = await fetch("/api/push/config");
  const config = await configResponse.json() as PushConfig;
  if (!config.enabled || !config.publicKey) {
    return { ok: false, reason: "Web Push serverda hali sozlanmagan" };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const payload = subscription.toJSON() as PushSubscriptionPayload;
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: payload,
      city,
      prayers,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, reason: body?.error || "Subscription saqlanmadi" };
  }
  return { ok: true };
}