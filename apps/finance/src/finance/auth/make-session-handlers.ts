import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import { lookups } from "#src/finance/db/lookups.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import type { FinanceAuth } from "./make-finance-auth.ts";
import { requireSession } from "./require-session.ts";

export function makeSessionHandlers(auth: FinanceAuth) {
  const { handle } = auth;
  return {
    ...auth.addPasskeyHandlers({
      requireUser: (request, context) =>
        requireSession(request, context, { write: true }),
    }),

    session: handle(
      async (request, context) => {
        const session = await requireSession(request, context, {
          write: false,
        });
        return authJson(context, {
          userId: session.userId,
          householdId: session.householdId,
          memberId: session.memberId,
          role: session.role,
        });
      },
      { method: "GET" },
    ),

    /** Signs the visitor in to the read-only demo Household as its owner. */
    startDemo: handle(async (request, context) => {
      const maxAgeSeconds = financeSessionCookie.demoMaxAgeSeconds;
      const token = await asFinanceApp(context.db, async (db) => {
        const demo = await lookups.demoOwner(db);
        if (!demo) throw new HttpError(404, "demo_not_found");
        return auth.createSession(
          db,
          request,
          context,
          demo.userId,
          maxAgeSeconds,
        );
      });
      auth.startSession(context, token, maxAgeSeconds);
      return authJson(context, { ok: true });
    }),
  };
}
