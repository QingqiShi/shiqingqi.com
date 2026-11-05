import { randomUUID } from "node:crypto";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { z } from "zod";
import { users } from "#src/finance/db/schema.ts";
import {
  asFinanceApp,
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { resolveClientIp } from "#src/http/resolve-client-ip.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import { isSupportedCurrency } from "../exchange-rates/supported-currencies.ts";
import { createEmailRecoveryInvite } from "./create-email-recovery-invite.ts";
import { createHousehold } from "./create-household.ts";
import { defaultAccountGroups } from "./default-account-groups.ts";
import { isEmailRegistered } from "./is-email-registered.ts";
import {
  HttpError,
  json,
  localeSchema,
  readBody,
  tokenBody,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import { openSession, startSession } from "./require-session.ts";
import { startEmailCode } from "./start-email-code.ts";
import { consumeSignUp, lookupSignUp, startSignUp } from "./start-sign-up.ts";
import { issueChallenge, takeChallenge } from "./take-challenge.ts";
import {
  codeBody,
  hashedAddress,
  issueEmailCode,
  readEmail,
  sendOrFail,
  takeEmailCode,
} from "./take-email-code.ts";
import {
  insertPasskey,
  registrationOptions,
  registrationResponseSchema,
  verifyRegistration,
} from "./verify-registration.ts";

const nameSchema = z.string().trim().min(1).max(100);

const currencySchema = z.string().refine(isSupportedCurrency);

function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const signUpVerifyBody = z.object({
  token: z.string().min(1),
  response: registrationResponseSchema,
  memberName: nameSchema,
  baseCurrency: currencySchema,
  /** The browser's time zone. The household takes the default zone when it is not one Node knows. */
  timezone: z.string().max(100).optional(),
  locale: localeSchema,
});

/**
 * Makes a Recovery link when a user has `email` as a verified Recovery
 * email, and else starts a sign-up. Returns the path of the new link.
 */
async function startSignUpOrRecovery(
  db: FinanceAppDb,
  {
    email,
    now,
    replaceEmailed,
  }: { email: string; now: Date; replaceEmailed: boolean },
): Promise<{ path: string; registered: boolean }> {
  const recoveryToken = await createEmailRecoveryInvite(db, {
    email,
    now,
    replaceEmailed,
  });
  if (recoveryToken !== null) {
    return { path: `/invite/${recoveryToken}`, registered: true };
  }
  // A new link for the address ends the emailed one, so that one
  // request makes at most one User.
  const token = await startSignUp(db, { email, now });
  return { path: `/sign-up/${token}`, registered: false };
}

export function makeSignUpHandlers({
  handle,
  withLimits,
  requireEmailSender,
}: AuthRouteKit) {
  return {
    requestSignUp: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await withLimits(
        [
          ["sign-up-ip", resolveClientIp(request.headers)],
          ["sign-up-address", hashedAddress(email)],
        ],
        async () => {
          const { now, origin } = context;
          const { path, registered, codeId, code } = await asFinanceApp(
            context.db,
            async (db) => ({
              ...(await startSignUpOrRecovery(db, {
                email,
                now,
                replaceEmailed: true,
              })),
              ...(await startEmailCode(db, {
                purpose: "sign-up",
                email,
                now,
              })),
            }),
          );
          await sendOrFail(
            sender,
            buildCodeEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(path, locale)}`,
              reason: registered ? "registered-sign-up" : "sign-up",
            }),
          );
          issueEmailCode(context, { purpose: "sign-up", codeId });
        },
      );
      return json(context, { ok: true }, 202);
    }),

    signUpCode: handle(async (request, context) => {
      const { code } = await readBody(request, codeBody);
      const email = await takeEmailCode(request, context, "sign-up", code);
      const { path } = await asFinanceApp(context.db, (db) =>
        startSignUpOrRecovery(db, {
          email,
          now: context.now,
          replaceEmailed: false,
        }),
      );
      return json(context, { path });
    }),

    signUpOptions: handle(async (request, context) => {
      const { token } = await readBody(request, tokenBody);
      const signUp = await lookupSignUp(context.db, token, context.now);
      if (!signUp) throw new HttpError(410, "sign_up_invalid");
      if (
        await asFinanceApp(context.db, (db) =>
          isEmailRegistered(db, signUp.email),
        )
      ) {
        throw new HttpError(409, "email_registered");
      }

      const userId = randomUUID();
      const options = await registrationOptions(context, {
        userId,
        userName: signUp.email,
      });
      issueChallenge(context, {
        purpose: "sign-up",
        challenge: options.challenge,
        userId,
        signUpId: signUp.signUpId,
      });
      return json(context, { options, email: signUp.email });
    }),

    signUpVerify: handle(async (request, context) => {
      const body = await readBody(request, signUpVerifyBody);
      const { challenge, userId, signUpId } = takeChallenge(
        request,
        context,
        "sign-up",
      );
      const { db, now } = context;
      const signUp = await lookupSignUp(db, body.token, now);
      if (signUp?.signUpId !== signUpId) {
        throw new HttpError(410, "sign_up_invalid");
      }
      const info = await verifyRegistration(context, body.response, challenge);

      const result = await asFinanceApp(db, async (tx) => {
        if (!(await consumeSignUp(tx, { signUpId, now }))) {
          throw new HttpError(410, "sign_up_invalid");
        }
        await tx.insert(users).values({
          id: userId,
          displayName: body.memberName,
          email: signUp.email,
          emailVerifiedAt: now,
        });
        const householdId = randomUUID();
        const memberId = randomUUID();
        await withHousehold(tx, householdId, (scope) =>
          createHousehold(scope, {
            name: body.memberName,
            baseCurrency: body.baseCurrency,
            timezone:
              body.timezone !== undefined && isTimeZone(body.timezone)
                ? body.timezone
                : undefined,
            members: [
              { id: memberId, name: body.memberName, role: "owner", userId },
            ],
            groups: defaultAccountGroups(body.locale),
          }),
        );
        await insertPasskey(tx, userId, info, now);
        const token = await openSession(tx, request, userId, now);
        return { householdId, memberId, token };
      });

      startSession(context, result.token);
      return json(context, {
        householdId: result.householdId,
        memberId: result.memberId,
      });
    }),
  };
}
