import type { FinanceAppDb } from "#src/finance/db/with-household.ts";
import { createSession } from "./create-session.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { HttpError, type Context } from "./make-auth-route-kit.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FinanceSession } from "./types.ts";

export function openSession(
  db: FinanceAppDb,
  request: Request,
  userId: string,
  now: Date,
  maxAgeSeconds?: number,
) {
  return createSession(db, {
    userId,
    userAgent: request.headers.get("User-Agent") ?? "",
    now,
    maxAgeSeconds,
  });
}

/** The session of the request. A `write` refuses the read-only demo. */
export async function requireSession(
  request: Request,
  context: Context,
  { write }: { write: boolean },
): Promise<FinanceSession> {
  const token = readRequestCookie(request, financeSessionCookie.name);
  const resolved = token
    ? await resolveSession(context.db, token, {
        now: context.now,
        allowRefresh: true,
      })
    : null;
  if (!token || !resolved) throw new HttpError(401, "unauthorized");
  if (resolved.refreshed) {
    context.setCookies.push(
      financeSessionCookie.serialize(token, context.secure),
    );
  }
  if (write && resolved.session.readOnly) {
    throw new HttpError(403, "read_only");
  }
  return resolved.session;
}

export function startSession(
  context: Context,
  token: string,
  maxAgeSeconds?: number,
) {
  context.setCookies.push(
    financeSessionCookie.serialize(token, context.secure, maxAgeSeconds),
  );
}
