import { ipAddress } from "@vercel/functions";

/** The caller's IP on Vercel, for rate limits. Local requests share one bucket. */
export function clientIp(request: Request): string {
  return ipAddress(request) ?? "local";
}
