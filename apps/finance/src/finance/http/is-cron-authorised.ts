import { constantTimeEqual } from "../auth/constant-time-equal.ts";

/**
 * True when the request carries `Authorization: Bearer <secret>`, as Vercel
 * Cron sends it. The compare takes the same time for every wrong token. With
 * no secret set, nothing is authorised.
 */
export function isCronAuthorised(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const header = request.headers.get("Authorization") ?? "";
  return constantTimeEqual(header, `Bearer ${secret}`);
}
