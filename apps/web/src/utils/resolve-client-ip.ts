/**
 * Resolve the client IP for rate-limit bucketing.
 *
 * Header preference order (most-trusted first):
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge and not forwardable
 *      from the client, so it's the safest source of the original IP.
 *   2. `x-forwarded-for` — broadly used but client-spoofable, so only
 *      consulted when the platform-trusted header is absent.
 *   3. `"unknown"` — a stable bucket so misconfigured deployments still
 *      apply *some* throttling rather than offering an unmetered escape
 *      hatch.
 *
 * Both header values are comma-separated lists; we take the first non-empty
 * trimmed entry (the original client IP as recorded by the proxy).
 *
 * Shared between API routes that bucket rate limits per IP — keep this as
 * the single source of truth so header-priority semantics stay consistent.
 */
export function resolveClientIp(headers: Headers): string {
  const candidates = [
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-forwarded-for"),
  ];
  for (const value of candidates) {
    if (value === null) continue;
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return "unknown";
}
