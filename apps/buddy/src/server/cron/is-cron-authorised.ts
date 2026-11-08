import { constantTimeEqual } from "../auth/constant-time-equal.ts";

export function isCronAuthorised(request: Request, secret: string | undefined) {
  if (!secret) return false;
  return constantTimeEqual(
    request.headers.get("Authorization") ?? "",
    `Bearer ${secret}`,
  );
}
