import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  DEFAULT_TIME_ZONE,
  invites,
  passkeys,
  sessions,
  users,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  asAssistantApp,
  withUser,
  type AssistantAppDb,
} from "#src/assistant/db/with-user.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import {
  assistantChallengeCookie,
  type ChallengePayload,
} from "./assistant-challenge-cookie.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { createSession } from "./create-session.ts";
import { deleteSession } from "./delete-session.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { lookupInvite } from "./lookup-invite.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import { uuidToBytes } from "./uuid-to-bytes.ts";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => AssistantDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  isAllowedOrigin: (origin: string) => boolean;
}

type Handler = (request: Request) => Promise<Response>;

export interface AuthHandlers {
  signInOptions: Handler;
  signInVerify: Handler;
  inviteOptions: Handler;
  inviteVerify: Handler;
  signOut: Handler;
  session: Handler;
}

const RP_NAME = "Mail Assistant";

interface Context {
  db: AssistantDb;
  secret: string;
  origin: string;
  rpID: string;
  secure: boolean;
  now: Date;
  setCookies: string[];
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function isObjectWithId(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const registrationResponseSchema =
  z.custom<RegistrationResponseJSON>(isObjectWithId);
const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(isObjectWithId);

const tokenBody = z.object({ token: z.string().min(1) });
const inviteVerifyBody = tokenBody.extend({
  response: registrationResponseSchema,
  /** The browser's time zone. A new user takes the default zone when it is not one Node knows. */
  timeZone: z.string().max(100).optional(),
});
const authenticationVerifyBody = z.object({
  response: authenticationResponseSchema,
});

function json(
  context: Pick<Context, "setCookies">,
  body: unknown,
  status = 200,
) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of context.setCookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { status, headers });
}

async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "invalid_body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "invalid_body");
  return parsed.data;
}

function hasPurpose<P extends ChallengePayload["purpose"]>(
  payload: ChallengePayload,
  purpose: P,
): payload is Extract<ChallengePayload, { purpose: P }> {
  return payload.purpose === purpose;
}

/**
 * The passkey routes: sign-in with a saved passkey, and an invite from
 * `assistant:invite-link` that makes a user (or lets one back in) with a new
 * passkey on this device.
 */
export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  function prepareContext(request: Request): Context {
    const db = deps.getDb();
    const secret = deps.authSecret();
    if (!db || !secret) throw new HttpError(503, "not_configured");
    const origin = getRequestOrigin(request);
    if (!deps.isAllowedOrigin(origin)) {
      throw new HttpError(403, "forbidden_origin");
    }
    return {
      db,
      secret,
      origin,
      rpID: passkeyRpId(new URL(origin).hostname),
      secure: needsSecureCookie(origin),
      now: deps.now(),
      setCookies: [],
    };
  }

  function handle(
    run: (request: Request, context: Context) => Promise<Response>,
    { method }: { method: "GET" | "POST" } = { method: "POST" },
  ): Handler {
    return async (request) => {
      let context: Context | null = null;
      try {
        if (method === "POST" && !isSameOrigin(request)) {
          throw new HttpError(403, "forbidden_origin");
        }
        context = prepareContext(request);
        return await run(request, context);
      } catch (error) {
        if (error instanceof HttpError) {
          return json(
            { setCookies: context?.setCookies ?? [] },
            { error: error.code },
            error.status,
          );
        }
        throw error;
      }
    };
  }

  function issueChallenge(context: Context, payload: ChallengePayload) {
    context.setCookies.push(
      assistantChallengeCookie.serialize(
        assistantChallengeCookie.seal(payload, context.secret, context.now),
        context.secure,
      ),
    );
  }

  function takeChallenge<P extends ChallengePayload["purpose"]>(
    request: Request,
    context: Context,
    purpose: P,
  ): Extract<ChallengePayload, { purpose: P }> {
    context.setCookies.push(assistantChallengeCookie.clear(context.secure));
    const value = readRequestCookie(request, assistantChallengeCookie.name);
    const payload = value
      ? assistantChallengeCookie.open(value, context.secret, context.now)
      : null;
    if (!payload || !hasPurpose(payload, purpose)) {
      throw new HttpError(400, "challenge_invalid");
    }
    return payload;
  }

  async function openSession(
    db: AssistantAppDb,
    request: Request,
    context: Context,
    userId: string,
  ) {
    const token = await createSession(db, {
      userId,
      userAgent: request.headers.get("User-Agent") ?? "",
      now: context.now,
    });
    context.setCookies.push(
      assistantSessionCookie.serialize(token, context.secure),
    );
  }

  async function verifyRegistration(
    context: Context,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
  ) {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: context.origin,
        expectedRPID: context.rpID,
        requireUserVerification: false,
      });
      if (verification.verified) return verification.registrationInfo;
    } catch (error) {
      console.warn(
        "Assistant passkey registration failed:",
        error instanceof Error ? error.message : error,
      );
    }
    throw new HttpError(400, "passkey_invalid");
  }

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

      const passkey = (
        await asAssistantApp(context.db, (db) =>
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
          "Assistant passkey sign-in failed:",
          error instanceof Error ? error.message : error,
        );
        throw new HttpError(401, "passkey_invalid");
      }

      await asAssistantApp(context.db, async (db) => {
        await db
          .update(passkeys)
          .set({ counter: newCounter, lastUsedAt: context.now })
          .where(eq(passkeys.id, passkey.id));
        await openSession(db, request, context, passkey.userId);
      });
      return json(context, { ok: true });
    }),

    inviteOptions: handle(async (request, context) => {
      const { token } = await readBody(request, tokenBody);
      const invite = await lookupInvite(context.db, token, context.now);
      if (!invite) throw new HttpError(410, "invite_invalid");

      const userId = invite.recoveryUserId ?? randomUUID();
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: context.rpID,
        userID: uuidToBytes(userId),
        userName: invite.displayName,
        userDisplayName: invite.displayName,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "preferred",
        },
      });
      issueChallenge(context, {
        purpose: "invite",
        challenge: options.challenge,
        userId,
        inviteId: invite.inviteId,
      });
      return json(context, {
        options,
        displayName: invite.displayName,
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
      const { credential } = await verifyRegistration(
        context,
        body.response,
        challenge,
      );
      const timeZone =
        body.timeZone !== undefined && isTimeZone(body.timeZone)
          ? body.timeZone
          : DEFAULT_TIME_ZONE;

      await withUser(context.db, userId, async ({ db }) => {
        const used = await db
          .update(invites)
          .set({ usedAt: now })
          .where(
            and(
              eq(invites.id, inviteId),
              isNull(invites.usedAt),
              gt(invites.expiresAt, now),
            ),
          )
          .returning({ id: invites.id });
        if (used.length === 0) throw new HttpError(410, "invite_invalid");

        if (invite.recoveryUserId === null) {
          await db
            .insert(users)
            .values({ id: userId, displayName: invite.displayName });
          await db.insert(userSettings).values({ userId, timeZone });
        } else {
          // The user lost every passkey. A lost device must not keep
          // access, so its passkeys and sessions stop here.
          await db.delete(passkeys).where(eq(passkeys.userId, userId));
          await db.delete(sessions).where(eq(sessions.userId, userId));
        }
        const inserted = await db
          .insert(passkeys)
          .values({
            id: credential.id,
            userId,
            publicKey: credential.publicKey,
            counter: credential.counter,
            transports: credential.transports ?? [],
            createdAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: passkeys.id });
        if (inserted.length === 0) throw new HttpError(409, "passkey_exists");
        await openSession(db, request, context, userId);
      });
      return json(context, { ok: true });
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, assistantSessionCookie.name);
      if (token) {
        await asAssistantApp(context.db, (db) => deleteSession(db, token));
      }
      context.setCookies.push(assistantSessionCookie.clear(context.secure));
      return json(context, { ok: true });
    }),

    session: handle(
      async (request, context) => {
        const token = readRequestCookie(request, assistantSessionCookie.name);
        const resolved = token
          ? await resolveSession(context.db, token, {
              now: context.now,
              allowRefresh: true,
            })
          : null;
        if (!token || !resolved) throw new HttpError(401, "unauthorized");
        if (resolved.refreshed) {
          context.setCookies.push(
            assistantSessionCookie.serialize(token, context.secure),
          );
        }
        return json(context, { userId: resolved.session.userId });
      },
      { method: "GET" },
    ),
  };
}
