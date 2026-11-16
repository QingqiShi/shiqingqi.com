import { HttpError } from "@tuja/server-auth/http-error";
import type { AuthContext } from "@tuja/server-auth/make-auth-route-kit";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FinanceSession } from "./types.ts";

/** The session of the request. A `write` refuses the read-only demo. */
export async function requireSession(
  request: Request,
  context: AuthContext<FinanceDb>,
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
