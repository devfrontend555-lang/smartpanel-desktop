import { Client } from "@replit/object-storage";

const bucketId = process.env.APP_STORAGE_BUCKET_ID;
const enabled = process.env.APP_STORAGE_ENABLED === "true" || Boolean(bucketId);
const client = enabled
  ? new Client(bucketId ? { bucketId } : undefined)
  : null;

function resultError(result: { error?: { message?: string } }) {
  return result.error?.message || "App Storage request failed";
}

export function audioStorageStatus(): string {
  if (!enabled) return "local (App Storage not configured)";
  return bucketId
    ? "app-storage (bucket configured)"
    : "app-storage (default bucket)";
}

/**
 * Download a shared audio object to a local temporary file.
 * Returns false only when the object does not exist.
 */
export async function downloadSharedAudio(objectName: string, destination: string): Promise<boolean> {
  if (!client) return false;
  const result = await client.downloadToFilename(objectName, destination);
  if (result.ok) return true;
  if (result.error?.statusCode === 404) return false;
  throw new Error(resultError(result));
}

export async function uploadSharedAudio(objectName: string, filename: string): Promise<void> {
  if (!client) return;
  const result = await client.uploadFromFilename(objectName, filename);
  if (!result.ok) throw new Error(resultError(result));
}