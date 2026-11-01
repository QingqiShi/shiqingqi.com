import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { passkeys } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import {
  assistantChallengeCookie,
  type ChallengePayload,
} from "./assistant-challenge-cookie.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { createSession } from "./create-session.ts";
import { deleteSession } from "./delete-session.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
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
  signOut: Handler;
  session: Handler;
}

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

const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(isObjectWithId);

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

/**
 * The passkey routes: sign-in with a saved passkey, sign-out, and the
 * session check. The app has one user, whose passkeys exist already: there
 * is no sign-up.
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

  function takeChallenge(request: Request, context: Context): ChallengePayload {
    context.setCookies.push(assistantChallengeCookie.clear(context.secure));
    const value = readRequestCookie(request, assistantChallengeCookie.name);
    const payload = value
      ? assistantChallengeCookie.open(value, context.secret, context.now)
      : null;
    if (!payload) {
      throw new HttpError(400, "challenge_invalid");
    }
    return payload;
  }

  async function openSession(
    db: AssistantDb,
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
      const { challenge } = takeChallenge(request, context);

      const passkey = (
        await context.db
          .select()
          .from(passkeys)
          .where(eq(passkeys.id, response.id))
          .limit(1)
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

      await context.db.transaction(async (db) => {
        await db
          .update(passkeys)
          .set({ counter: newCounter, lastUsedAt: context.now })
          .where(eq(passkeys.id, passkey.id));
        await openSession(db, request, context, passkey.userId);
      });
      return json(context, { ok: true });
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, assistantSessionCookie.name);
      if (token) {
        await deleteSession(context.db, token);
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
