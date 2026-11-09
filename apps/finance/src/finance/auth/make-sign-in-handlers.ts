import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { uuidToBytes } from "@tuja/server-auth/uuid-to-bytes";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { lookups } from "#src/finance/db/lookups.ts";
import { memberRepository } from "#src/finance/db/repositories/member-repository.ts";
import { passkeys } from "#src/finance/db/schema.ts";
import { asFinanceApp, withHousehold } from "#src/finance/db/with-household.ts";
import { deleteSession } from "./delete-session.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import {
  HttpError,
  json,
  readBody,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import {
  openSession,
  requireSession,
  startSession,
} from "./require-session.ts";
import { issueChallenge, takeChallenge } from "./take-challenge.ts";
import {
  authenticationResponseSchema,
  insertPasskey,
  registrationOptions,
  registrationResponseSchema,
  verifyRegistration,
} from "./verify-registration.ts";

const registrationVerifyBody = z.object({
  response: registrationResponseSchema,
});

const authenticationVerifyBody = z.object({
  response: authenticationResponseSchema,
});

export function makeSignInHandlers({ handle }: AuthRouteKit) {
  return {
    signInOptions: handle(async (_request, context) => {
      const options = await generateAuthenticationOptions({
        rpID: context.rpID,
        userVerification: "preferred",
      });
      issueChallenge(context, {
        purpose: "sign-in",
        challenge: options.challenge,
      });
      return json(context, { options });
    }),

    signInVerify: handle(async (request, context) => {
      const { response } = await readBody(request, authenticationVerifyBody);
      const { challenge } = takeChallenge(request, context, "sign-in");
      const { now } = context;

      const passkey = (
        await asFinanceApp(context.db, (db) =>
          db
            .select()
            .from(passkeys)
            .where(eq(passkeys.id, response.id))
            .limit(1),
        )
      ).at(0);
      if (!passkey) throw new HttpError(401, "passkey_unknown");
      const userHandle = response.response.userHandle;
      if (
        userHandle !== undefined &&
        userHandle !==
          Buffer.from(uuidToBytes(passkey.userId)).toString("base64url")
      ) {
        throw new HttpError(401, "passkey_unknown");
      }

      let newCounter: number;
      try {
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: context.origin,
          expectedRPID: context.rpID,
          requireUserVerification: false,
          credential: {
            id: passkey.id,
            publicKey: new Uint8Array(passkey.publicKey),
            counter: passkey.counter,
            transports: passkey.transports,
          },
        });
        if (!verification.verified) throw new Error("not verified");
        newCounter = verification.authenticationInfo.newCounter;
      } catch (error) {
        console.warn(
          "Finance passkey sign-in failed:",
          error instanceof Error ? error.message : error,
        );
        throw new HttpError(401, "passkey_invalid");
      }

      const token = await asFinanceApp(context.db, async (db) => {
        const memberships = await lookups.membershipsOfUser(db, passkey.userId);
        if (memberships.length === 0) throw new HttpError(403, "no_membership");
        await db
          .update(passkeys)
          .set({ counter: newCounter, lastUsedAt: now })
          .where(eq(passkeys.id, passkey.id));
        return openSession(db, request, passkey.userId, now);
      });
      startSession(context, token);
      return json(context, { ok: true });
    }),

    passkeyOptions: handle(async (request, context) => {
      const session = await requireSession(request, context, { write: true });
      const { member, existing } = await withHousehold(
        context.db,
        session.householdId,
        async (scope) => ({
          member: await memberRepository.findById(scope, session.memberId),
          existing: await scope.db
            .select({ id: passkeys.id, transports: passkeys.transports })
            .from(passkeys)
            .where(eq(passkeys.userId, session.userId))
            .orderBy(asc(passkeys.createdAt)),
        }),
      );
      const options = await registrationOptions(context, {
        userId: session.userId,
        userName: member?.name ?? "Finance",
        excludeCredentials: existing,
      });
      issueChallenge(context, {
        purpose: "add-passkey",
        challenge: options.challenge,
        userId: session.userId,
      });
      return json(context, { options });
    }),

    passkeyVerify: handle(async (request, context) => {
      const session = await requireSession(request, context, { write: true });
      const { response } = await readBody(request, registrationVerifyBody);
      const { challenge, userId } = takeChallenge(
        request,
        context,
        "add-passkey",
      );
      if (userId !== session.userId) {
        throw new HttpError(400, "challenge_invalid");
      }
      const info = await verifyRegistration(context, response, challenge);
      await asFinanceApp(context.db, (db) =>
        insertPasskey(db, session.userId, info, context.now),
      );
      return json(context, { ok: true });
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, financeSessionCookie.name);
      if (token) {
        await asFinanceApp(context.db, (db) => deleteSession(db, token));
      }
      context.setCookies.push(financeSessionCookie.clear(context.secure));
      return json(context, { ok: true });
    }),

    session: handle(
      async (request, context) => {
        const session = await requireSession(request, context, {
          write: false,
        });
        return json(context, {
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
      const token = await asFinanceApp(context.db, async (db) => {
        const demo = await lookups.demoOwner(db);
        if (!demo) throw new HttpError(404, "demo_not_found");
        return openSession(
          db,
          request,
          demo.userId,
          context.now,
          financeSessionCookie.demoMaxAgeSeconds,
        );
      });
      startSession(context, token, financeSessionCookie.demoMaxAgeSeconds);
      return json(context, { ok: true });
    }),
  };
}
