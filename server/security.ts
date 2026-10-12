import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight security headers that do not interfere with the Replit preview
 * iframe or the app's external audio/media widgets.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

/**
 * Reject unexpected query shapes and oversized/control-character values before
 * they reach upstream URL construction or cache-key generation.
 */
export function validateQuery(req: Request, res: Response, next: NextFunction) {
  for (const [key, value] of Object.entries(req.query)) {
    if (
      typeof value !== "string" ||
      value.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(value)
    ) {
      res.status(400).json({ error: `Invalid query parameter: ${key}` });
      return;
    }
  }
  next();
}

export function publicApiError(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === "production") return fallback;
  return error instanceof Error ? error.message : fallback;
}