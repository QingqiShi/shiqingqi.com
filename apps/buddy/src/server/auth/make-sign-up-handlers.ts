import { randomBytes, randomUUID } from "node:crypto";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { eq } from "drizzle-orm";
import { accounts } from "#src/server/db/schema.ts";
import type { BuddyDb } from "#src/server/db/types.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import { createEmailRecovery } from "./create-email-recovery.ts";
import {
  HttpError,
  issueChallenge,
  json,
  openSession,
  readBody,
  takeChallenge,
  tokenBody,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import { startEmailCode } from "./start-email-code.ts";
import { consumeSignUp, lookupSignUp, startSignUp } from "./start-sign-up.ts";
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

const signUpVerifyBody = tokenBody.extend({
  response: registrationResponseSchema,
});

const NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const NAME_LENGTH = 8;
const NAME_ATTEMPTS = 5;

function generateAccountName() {
  // 256 is not a multiple of 36, so a plain modulo would favor some characters.
  const unbiasedLimit = 256 - (256 % NAME_ALPHABET.length);
  let name = "";
  while (name.length < NAME_LENGTH) {
    for (const byte of randomBytes(NAME_LENGTH)) {
      if (byte < unbiasedLimit && name.length < NAME_LENGTH) {
        name += NAME_ALPHABET[byte % NAME_ALPHABET.length];
      }
    }
  }
  return name;
}

async function isEmailRegistered(db: BuddyDb, email: string) {
  return (await db.$count(accounts, eq(accounts.email, email))) > 0;
}

/**
 * Makes a recovery link when an account has `email`, and else starts a
 * sign-up. Returns the path of the new link.
 */
async function startSignUpOrRecovery(
  db: BuddyDb,
  {
    email,
    now,
    replaceEmailed,
  }: { email: string; now: Date; replaceEmailed: boolean },
): Promise<{ path: string; registered: boolean }> {
  const recoveryToken = await createEmailRecovery(db, {
    email,
    now,
    replaceEmailed,
  });
  if (recoveryToken !== null) {
    return { path: `/recover/${recoveryToken}`, registered: true };
  }
  // A new link for the address ends the emailed one, so that one
  // request makes at most one account.
  const token = await startSignUp(db, { email, now });
  return { path: `/sign-up/${token}`, registered: false };
}

export function makeSignUpHandlers({
  handle,
  limit,
  clientIp,
  requireEmailSender,
}: AuthRouteKit) {
  return {
    requestSignUp: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await limit("sign-up-ip", clientIp(request));
      await limit("sign-up-address", hashedAddress(email));
      const { db, now, origin } = context;
      const { path, registered, codeId, code } = await db.transaction(
        async (tx) => ({
          ...(await startSignUpOrRecovery(tx, {
            email,
            now,
            replaceEmailed: true,
          })),
          ...(await startEmailCode(tx, { purpose: "sign-up", email, now })),
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
      return json(context, { ok: true }, 202);
    }),

    signUpCode: handle(async (request, context) => {
      const { code } = await readBody(request, codeBody);
      const email = await takeEmailCode(request, context, "sign-up", code);
      const { path } = await context.db.transaction((db) =>
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
      if (await isEmailRegistered(context.db, signUp.email)) {
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

      let createdName = "";
      await db.transaction(async (tx) => {
        if (!(await consumeSignUp(tx, { signUpId, now }))) {
          throw new HttpError(410, "sign_up_invalid");
        }
        if (await isEmailRegistered(tx, signUp.email)) {
          throw new HttpError(409, "email_registered");
        }
        let name: string | null = null;
        for (
          let attempt = 0;
          name === null && attempt < NAME_ATTEMPTS;
          attempt++
        ) {
          const candidate = generateAccountName();
          const created = await tx
            .insert(accounts)
            .values({
              id: userId,
              name: candidate,
              email: signUp.email,
              createdAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: accounts.id });
          if (created.length > 0) name = candidate;
        }
        if (name === null) throw new HttpError(409, "email_registered");
        createdName = name;
        await insertPasskey(tx, userId, info, now);
        await openSession(tx, request, context, userId);
      });
      return json(context, { name: createdName });
    }),
  };
}
