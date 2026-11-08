import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { eq } from "drizzle-orm";
import { passkeys, sessions } from "#src/server/db/schema.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import {
  consumeRecovery,
  createEmailRecovery,
  lookupRecovery,
} from "./create-email-recovery.ts";
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
import {
  codeBody,
  hashedAddress,
  issueEmailCode,
  readEmail,
  takeEmailCode,
} from "./take-email-code.ts";
import {
  insertPasskey,
  registrationOptions,
  registrationResponseSchema,
  verifyRegistration,
} from "./verify-registration.ts";

const recoveryVerifyBody = tokenBody.extend({
  response: registrationResponseSchema,
});

export function makeRecoveryHandlers({
  handle,
  limit,
  clientIp,
  requireEmailSender,
  afterResponse,
}: AuthRouteKit) {
  return {
    requestRecovery: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await limit("recovery-email-ip", clientIp(request));
      await limit("recovery-email-address", hashedAddress(email));
      const { db, now, origin } = context;
      const { codeId, code } = await startEmailCode(db, {
        purpose: "recovery",
        email,
        now,
      });
      issueEmailCode(context, { purpose: "recovery", codeId });
      // The response must be the same when no account has this email. Thus
      // the search and the email occur after the response.
      afterResponse(async () => {
        try {
          const token = await createEmailRecovery(db, {
            email,
            now,
            replaceEmailed: true,
          });
          if (token === null) return;
          await sender.send(
            buildCodeEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(`/recover/${token}`, locale)}`,
            }),
          );
        } catch (error) {
          console.error("Buddy recovery email failed:", error);
        }
      });
      return json(context, { ok: true }, 202);
    }),

    recoveryCode: handle(async (request, context) => {
      const { code } = await readBody(request, codeBody);
      const email = await takeEmailCode(request, context, "recovery", code);
      const token = await createEmailRecovery(context.db, {
        email,
        now: context.now,
        replaceEmailed: false,
      });
      if (token === null) throw new HttpError(410, "code_expired");
      return json(context, { path: `/recover/${token}` });
    }),

    recoveryOptions: handle(async (request, context) => {
      const { token } = await readBody(request, tokenBody);
      const recovery = await lookupRecovery(context.db, token, context.now);
      if (!recovery) throw new HttpError(410, "recovery_invalid");
      const options = await registrationOptions(context, {
        userId: recovery.userId,
        userName: recovery.email,
      });
      issueChallenge(context, {
        purpose: "recovery",
        challenge: options.challenge,
        userId: recovery.userId,
        recoveryId: recovery.recoveryId,
      });
      return json(context, { options });
    }),

    recoveryVerify: handle(async (request, context) => {
      const body = await readBody(request, recoveryVerifyBody);
      const { challenge, userId, recoveryId } = takeChallenge(
        request,
        context,
        "recovery",
      );
      const { now } = context;
      const recovery = await lookupRecovery(context.db, body.token, now);
      if (recovery?.recoveryId !== recoveryId || recovery.userId !== userId) {
        throw new HttpError(410, "recovery_invalid");
      }
      const info = await verifyRegistration(context, body.response, challenge);
      await context.db.transaction(async (db) => {
        if (!(await consumeRecovery(db, { recoveryId, now }))) {
          throw new HttpError(410, "recovery_invalid");
        }
        // The account lost every passkey. A lost device must not keep
        // access, so its passkeys and sessions stop here.
        await db.delete(passkeys).where(eq(passkeys.userId, userId));
        await db.delete(sessions).where(eq(sessions.userId, userId));
        await insertPasskey(db, userId, info, now);
        await openSession(db, request, context, userId);
      });
      return json(context, { name: recovery.name });
    }),
  };
}
