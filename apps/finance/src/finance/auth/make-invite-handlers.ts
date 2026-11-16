import { authBodies } from "@tuja/server-auth/auth-bodies";
import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import { readAuthBody } from "@tuja/server-auth/read-auth-body";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { z } from "zod";
import { asFinanceApp, withHousehold } from "#src/finance/db/with-household.ts";
import { acceptInvite } from "./accept-invite.ts";
import { createInvite } from "./create-invite.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import type { FinanceAuth } from "./make-finance-auth.ts";
import { requireSession } from "./require-session.ts";
import { resolveNewUser } from "./resolve-session.ts";

const createInviteBody = z.object({ memberId: z.uuid() });

export function makeInviteHandlers({ handle }: FinanceAuth) {
  return {
    /** Makes the signed-in user, who is a Member of no Household, the invited Member. */
    acceptInvite: handle(async (request, context) => {
      const { token } = await readAuthBody(request, authBodies.token);
      const cookie = readRequestCookie(request, financeSessionCookie.name);
      const user = cookie
        ? await resolveNewUser(context.db, cookie, context.now)
        : null;
      if (!user) {
        await requireSession(request, context, { write: false });
        throw new HttpError(409, "already_member");
      }
      return authJson(
        context,
        await asFinanceApp(context.db, (tx) =>
          acceptInvite(tx, { token, userId: user.userId, now: context.now }),
        ),
      );
    }),

    createInvite: handle(async (request, context) => {
      const session = await requireSession(request, context, { write: true });
      const { memberId } = await readAuthBody(request, createInviteBody);
      const result = await withHousehold(
        context.db,
        session.householdId,
        (scope) =>
          createInvite(scope, {
            memberId,
            createdBy: session.userId,
            allowRecovery: session.role === "owner",
            now: context.now,
          }),
      );
      if (!result.ok) {
        throw new HttpError(
          { member_not_found: 404, member_claimed: 409, owner_only: 403 }[
            result.reason
          ],
          result.reason,
        );
      }
      return authJson(
        context,
        {
          token: result.token,
          path: result.path,
          expiresAt: result.expiresAt.toISOString(),
          recovery: result.recovery,
        },
        201,
      );
    }),
  };
}
