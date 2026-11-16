import { randomUUID } from "node:crypto";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { authBodies } from "@tuja/server-auth/auth-bodies";
import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import { makeChallenge } from "@tuja/server-auth/make-challenge";
import { normaliseEmail } from "@tuja/server-auth/normalise-email";
import { passkeyRegistrationOptions } from "@tuja/server-auth/passkey-registration-options";
import { passkeyResponseSchemas } from "@tuja/server-auth/passkey-response-schemas";
import { readAuthBody } from "@tuja/server-auth/read-auth-body";
import { verifyPasskeyRegistration } from "@tuja/server-auth/verify-passkey-registration";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { invites, users } from "#src/finance/db/schema.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import { buildVerificationEmail } from "../email/build-verification-email.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";
import { createInvite } from "./create-invite.ts";
import { financeAuthStore } from "./finance-auth-store.ts";
import {
  financeChallengeCookie,
  inviteChallenge,
} from "./finance-challenge-cookie.ts";
import { lookupInvite } from "./lookup-invite.ts";
import type { AuthHandlerDeps, FinanceAuth } from "./make-finance-auth.ts";
import { requireSession } from "./require-session.ts";
import { startEmailVerification } from "./start-email-verification.ts";

const challenge = makeChallenge(financeChallengeCookie);

const inviteOptionsBody = z.object({
  token: z.string().min(1),
  email: z.string().max(320).optional(),
});

const inviteVerifyBody = z.object({
  token: z.string().min(1),
  response: passkeyResponseSchemas.registration,
  email: z.string().max(320).optional(),
  locale: authBodies.locale,
});

const createInviteBody = z.object({ memberId: z.uuid() });

/** The Recovery email that the new user gives. */
function inviteEmail(given: string | undefined) {
  const email = normaliseEmail(given ?? "");
  if (!email) throw new HttpError(400, "email_invalid");
  return email;
}

export function makeInviteHandlers(
  { handle, createSession, startSession }: FinanceAuth,
  deps: Pick<AuthHandlerDeps, "emailSender" | "afterResponse">,
) {
  return {
    inviteOptions: handle(async (request, context) => {
      const body = await readAuthBody(request, inviteOptionsBody);
      const invite = await lookupInvite(context.db, body.token, context.now);
      if (!invite) throw new HttpError(410, "invite_invalid");
      inviteEmail(body.email);

      const userId = randomUUID();
      const options = await passkeyRegistrationOptions(context, {
        userId,
        userName: invite.memberName,
      });
      challenge.issue(context, {
        purpose: "invite",
        challenge: options.challenge,
        userId,
        inviteId: invite.inviteId,
      });
      return authJson(context, {
        options,
        householdName: invite.householdName,
        memberName: invite.memberName,
      });
    }),

    inviteVerify: handle(async (request, context) => {
      const body = await readAuthBody(request, inviteVerifyBody);
      const taken = challenge.take(request, context, inviteChallenge);
      const { userId, inviteId } = taken;
      const { now } = context;
      const invite = await lookupInvite(context.db, body.token, now);
      if (invite?.inviteId !== inviteId) {
        throw new HttpError(410, "invite_invalid");
      }
      const email = inviteEmail(body.email);
      const credential = await verifyPasskeyRegistration(
        context,
        body.response,
        taken.challenge,
      );

      const { token, verification } = await withHousehold(
        context.db,
        invite.householdId,
        async (scope) => {
          const { db } = scope;
          const used = await db
            .update(invites)
            .set({ usedAt: now })
            .where(
              and(
                eq(invites.householdId, invite.householdId),
                eq(invites.id, inviteId),
                isNull(invites.usedAt),
                gt(invites.expiresAt, now),
              ),
            )
            .returning({ id: invites.id });
          if (used.length === 0) throw new HttpError(410, "invite_invalid");

          await db
            .insert(users)
            .values({ id: userId, displayName: invite.memberName });
          const bound = await bindUserToMember(scope, {
            memberId: invite.memberId,
            userId,
          });
          if (!bound) throw new HttpError(409, "member_claimed");
          await financeAuthStore.insertPasskey(db, userId, credential, now);
          return {
            token: await createSession(db, request, context, userId),
            verification: {
              email,
              token: await startEmailVerification(db, { userId, email, now }),
            },
          };
        },
      );

      startSession(context, token);
      const sender = deps.emailSender();
      if (sender) {
        const url = `${context.origin}${getLocalePath(`/verify-email/${verification.token}`, body.locale)}`;
        deps.afterResponse(async () => {
          try {
            await sender.send(
              buildVerificationEmail({
                to: verification.email,
                locale: body.locale,
                url,
              }),
            );
          } catch (error) {
            console.error("Finance verification email failed:", error);
          }
        });
      }
      return authJson(context, {
        householdId: invite.householdId,
        memberId: invite.memberId,
      });
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
