import { randomUUID } from "node:crypto";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normaliseEmail } from "@tuja/server-auth/normalise-email";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { invites, passkeys, sessions, users } from "#src/finance/db/schema.ts";
import {
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { buildVerificationEmail } from "../email/build-verification-email.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";
import { createInvite } from "./create-invite.ts";
import { lookupInvite } from "./lookup-invite.ts";
import {
  HttpError,
  json,
  localeSchema,
  readBody,
  type AuthHandlerDeps,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import {
  openSession,
  requireSession,
  startSession,
} from "./require-session.ts";
import { startEmailVerification } from "./start-email-verification.ts";
import { issueChallenge, takeChallenge } from "./take-challenge.ts";
import {
  insertPasskey,
  registrationOptions,
  registrationResponseSchema,
  verifyRegistration,
} from "./verify-registration.ts";

const inviteOptionsBody = z.object({
  token: z.string().min(1),
  email: z.string().max(320).optional(),
});

const inviteVerifyBody = z.object({
  token: z.string().min(1),
  response: registrationResponseSchema,
  email: z.string().max(320).optional(),
  locale: localeSchema,
});

const createInviteBody = z.object({ memberId: z.uuid() });

async function revokeUserAccess(db: FinanceAppDb, userId: string) {
  await db.delete(passkeys).where(eq(passkeys.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** The email that a new-member invite needs. Null for a recovery invite, whose user keeps the email it has. */
function inviteEmail(recovery: boolean, given: string | undefined) {
  if (recovery) return null;
  const email = normaliseEmail(given ?? "");
  if (!email) throw new HttpError(400, "email_invalid");
  return email;
}

export function makeInviteHandlers(
  { handle }: AuthRouteKit,
  deps: AuthHandlerDeps,
) {
  return {
    inviteOptions: handle(async (request, context) => {
      const body = await readBody(request, inviteOptionsBody);
      const invite = await lookupInvite(context.db, body.token, context.now);
      if (!invite) throw new HttpError(410, "invite_invalid");
      inviteEmail(invite.recoveryUserId !== null, body.email);

      const userId = invite.recoveryUserId ?? randomUUID();
      const options = await registrationOptions(context, {
        userId,
        userName: invite.memberName,
      });
      issueChallenge(context, {
        purpose: "invite",
        challenge: options.challenge,
        userId,
        inviteId: invite.inviteId,
      });
      return json(context, {
        options,
        householdName: invite.householdName,
        memberName: invite.memberName,
        recovery: invite.recoveryUserId !== null,
      });
    }),

    inviteVerify: handle(async (request, context) => {
      const body = await readBody(request, inviteVerifyBody);
      const { challenge, userId, inviteId } = takeChallenge(
        request,
        context,
        "invite",
      );
      const { now } = context;
      const invite = await lookupInvite(context.db, body.token, now);
      if (
        !invite ||
        invite.inviteId !== inviteId ||
        (invite.recoveryUserId !== null && invite.recoveryUserId !== userId)
      ) {
        throw new HttpError(410, "invite_invalid");
      }
      const email = inviteEmail(invite.recoveryUserId !== null, body.email);
      const info = await verifyRegistration(context, body.response, challenge);

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

          if (invite.recoveryUserId !== null) {
            // The Member lost every passkey. A lost device must not keep
            // access, so its passkeys and sessions stop here.
            await revokeUserAccess(db, userId);
          } else {
            await db
              .insert(users)
              .values({ id: userId, displayName: invite.memberName });
            const bound = await bindUserToMember(scope, {
              memberId: invite.memberId,
              userId,
            });
            if (!bound) throw new HttpError(409, "member_claimed");
          }
          await insertPasskey(db, userId, info, now);
          return {
            token: await openSession(db, request, userId, now),
            verification:
              email === null
                ? null
                : {
                    email,
                    token: await startEmailVerification(db, {
                      userId,
                      email,
                      now,
                    }),
                  },
          };
        },
      );

      startSession(context, token);
      const sender = deps.emailSender();
      if (verification && sender) {
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
      return json(context, {
        householdId: invite.householdId,
        memberId: invite.memberId,
      });
    }),

    createInvite: handle(async (request, context) => {
      const session = await requireSession(request, context, { write: true });
      const { memberId } = await readBody(request, createInviteBody);
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
      return json(
        context,
        {
          token: result.token,
          path: `/invite/${result.token}`,
          expiresAt: result.expiresAt.toISOString(),
          recovery: result.recovery,
        },
        201,
      );
    }),
  };
}
