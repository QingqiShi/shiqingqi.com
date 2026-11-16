import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import { readAuthBody } from "@tuja/server-auth/read-auth-body";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { lookups } from "#src/finance/db/lookups.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import type { FinanceAuth } from "./make-finance-auth.ts";
import { requireSession } from "./require-session.ts";
import { resolveNewUser } from "./resolve-session.ts";
import { setUpFields, setUpHousehold } from "./set-up-household.ts";

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

    /** Makes the first Household of a signed-in user who is a Member of none. */
    setUp: handle(async (request, context) => {
      const fields = await readAuthBody(request, setUpFields);
      const token = readRequestCookie(request, financeSessionCookie.name);
      const user = token
        ? await resolveNewUser(context.db, token, context.now)
        : null;
      if (!user) {
        await requireSession(request, context, { write: false });
        throw new HttpError(409, "already_set_up");
      }
      return authJson(
        context,
        await asFinanceApp(context.db, (tx) =>
          setUpHousehold(tx, { userId: user.userId, fields }),
        ),
      );
    }),

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
