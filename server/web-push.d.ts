declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface SendNotificationOptions {
    TTL?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
  }

  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(
      subscription: PushSubscription,
      payload?: string,
      options?: SendNotificationOptions,
    ): Promise<unknown>;
  }

  const webpush: WebPush;
  export default webpush;
}