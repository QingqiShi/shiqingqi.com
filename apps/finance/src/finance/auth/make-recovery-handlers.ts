import { getLocalePath } from "@tuja/i18n/get-locale-path";
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
import { resolveClientIp } from "#src/http/resolve-client-ip.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import { buildRecoveryEmailChangedEmail } from "../email/build-recovery-email-changed-email.ts";
import { buildVerificationEmail } from "../email/build-verification-email.ts";
import { createEmailRecoveryInvite } from "./create-email-recovery-invite.ts";
import {
  HttpError,
  json,
  localeSchema,
  readBody,
  tokenBody,
  type AuthHandlerDeps,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import { requireSession } from "./require-session.ts";
import { startEmailCode } from "./start-email-code.ts";
import {
  startEmailVerification,
  verifyRecoveryEmail,
} from "./start-email-verification.ts";
import {
  codeBody,
  hashedAddress,
  issueEmailCode,
  readEmail,
  sendOrFail,
  takeEmailCode,
} from "./take-email-code.ts";

const verifyEmailBody = tokenBody.extend({ locale: localeSchema });

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

export function makeRecoveryHandlers(
  { handle, limit, withLimits, requireEmailSender }: AuthRouteKit,
  deps: AuthHandlerDeps,
) {
  return {
    recoveryEmail: handle(
      async (request, context) => {
        const session = await requireSession(request, context, {
          write: false,
        });
        return json(
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
        return json(context, current);
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
      return json(context, { email, verified: false });
    }),

    verifyEmail: handle(async (request, context) => {
      const { token, locale } = await readBody(request, verifyEmailBody);
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
      return json(context, { verified: verified !== null });
    }),

    requestRecovery: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await limit("recovery-email-ip", resolveClientIp(request.headers));
      await limit("recovery-email-address", hashedAddress(email));
      const { db, now, origin } = context;
      const { codeId, code } = await asFinanceApp(db, (tx) =>
        startEmailCode(tx, { purpose: "recovery", email, now }),
      );
      issueEmailCode(context, { purpose: "recovery", codeId });
      // The response must be the same when no user has this email. Thus the
      // search and the email occur after the response.
      deps.afterResponse(async () => {
        try {
          const token = await asFinanceApp(db, (tx) =>
            createEmailRecoveryInvite(tx, {
              email,
              now,
              replaceEmailed: true,
            }),
          );
          if (token === null) return;
          await sender.send(
            buildCodeEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(`/invite/${token}`, locale)}`,
            }),
          );
        } catch (error) {
          console.error("Finance recovery email failed:", error);
        }
      });
      return json(context, { ok: true }, 202);
    }),

    recoveryCode: handle(async (request, context) => {
      const { code } = await readBody(request, codeBody);
      const email = await takeEmailCode(request, context, "recovery", code);
      const token = await asFinanceApp(context.db, (db) =>
        createEmailRecoveryInvite(db, {
          email,
          now: context.now,
          replaceEmailed: false,
        }),
      );
      if (token === null) throw new HttpError(410, "code_expired");
      return json(context, { path: `/invite/${token}` });
    }),
  };
}
