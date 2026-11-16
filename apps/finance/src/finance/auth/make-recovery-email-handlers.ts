import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { authBodies } from "@tuja/server-auth/auth-bodies";
import { authJson } from "@tuja/server-auth/auth-json";
import { readAuthBody } from "@tuja/server-auth/read-auth-body";
import { eq } from "drizzle-orm";
import { lookups } from "#src/finance/db/lookups.ts";
import { householdRepository } from "#src/finance/db/repositories/household-repository.ts";
import { users } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import {
  asFinanceApp,
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "#src/finance/domain/dates/default-household-time-zone.ts";
import { buildRecoveryEmailChangedEmail } from "../email/build-recovery-email-changed-email.ts";
import { buildVerificationEmail } from "../email/build-verification-email.ts";
import type { AuthHandlerDeps, FinanceAuth } from "./make-finance-auth.ts";
import { requireSession } from "./require-session.ts";
import {
  startEmailVerification,
  verifyRecoveryEmail,
} from "./start-email-verification.ts";

const verifyEmailBody = authBodies.token.extend({ locale: authBodies.locale });

async function readRecoveryEmail(db: FinanceAppDb, userId: string) {
  const user = (
    await db
      .select({ email: users.email, verifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  ).at(0);
  return {
    email: user?.email ?? null,
    verified: user?.verifiedAt != null,
  };
}

async function householdTimeZone(db: FinanceDb, userId: string) {
  const membership = (
    await asFinanceApp(db, (tx) => lookups.membershipsOfUser(tx, userId))
  ).at(0);
  const household =
    membership &&
    (await withHousehold(db, membership.householdId, (scope) =>
      householdRepository.find(scope),
    ));
  return household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE;
}

/** The routes that read, change and confirm the Recovery email of the user that is signed in. */
export function makeRecoveryEmailHandlers(
  {
    handle,
    withLimits,
    requireEmailSender,
    readEmail,
    sendOrFail,
  }: FinanceAuth,
  deps: Pick<AuthHandlerDeps, "emailSender" | "afterResponse">,
) {
  return {
    recoveryEmail: handle(
      async (request, context) => {
        const session = await requireSession(request, context, {
          write: false,
        });
        return authJson(
          context,
          await asFinanceApp(context.db, (db) =>
            readRecoveryEmail(db, session.userId),
          ),
        );
      },
      { method: "GET" },
    ),

    setRecoveryEmail: handle(async (request, context) => {
      const session = await requireSession(request, context, { write: true });
      const { email, locale } = await readEmail(request);
      const current = await asFinanceApp(context.db, (db) =>
        readRecoveryEmail(db, session.userId),
      );
      if (current.email === email && current.verified) {
        return authJson(context, current);
      }
      const sender = requireEmailSender();
      await withLimits([["verify-email", session.userId]], async () => {
        const token = await asFinanceApp(context.db, (db) =>
          startEmailVerification(db, {
            userId: session.userId,
            email,
            now: context.now,
          }),
        );
        await sendOrFail(
          sender,
          buildVerificationEmail({
            to: email,
            locale,
            url: `${context.origin}${getLocalePath(`/verify-email/${token}`, locale)}`,
          }),
        );
      });
      return authJson(context, { email, verified: false });
    }),

    verifyEmail: handle(async (request, context) => {
      const { token, locale } = await readAuthBody(request, verifyEmailBody);
      const { db, now, origin } = context;
      const verified = await asFinanceApp(db, (tx) =>
        verifyRecoveryEmail(tx, token, now),
      );
      const sender = deps.emailSender();
      const replaced = verified?.replacedEmail;
      if (verified && replaced && sender) {
        deps.afterResponse(async () => {
          try {
            const timeZone = await householdTimeZone(db, verified.userId);
            await sender.send(
              buildRecoveryEmailChangedEmail({
                to: replaced,
                locale,
                newEmail: verified.email,
                changedAt: now,
                timeZone,
                settingsUrl: `${origin}${getLocalePath("/settings/members", locale)}`,
              }),
            );
          } catch (error) {
            console.error(
              "Finance recovery email change notice failed:",
              error,
            );
          }
        });
      }
      return authJson(context, { verified: verified !== null });
    }),
  };
}
