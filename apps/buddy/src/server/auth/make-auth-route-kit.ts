import { z } from "zod";
import type { BuddyDb } from "#src/server/db/types.ts";
import type { BuddyEmailSender } from "../email/types.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import {
  buddyChallengeCookie,
  type ChallengePayload,
} from "./buddy-challenge-cookie.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { createSession } from "./create-session.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";
import { readRequestCookie } from "./read-request-cookie.ts";

/** A group of auth routes that share one rate limit. */
export type AuthRateLimitBucket =
  | "auth"
  | "recovery-email-ip"
  | "recovery-email-address"
  | "sign-up-ip"
  | "sign-up-address";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => BuddyDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  isAllowedOrigin: (origin: string) => boolean;
  /** Counts one request of `identifier` in `bucket`. False when it is over the limit. */
  limitRequest: (
    bucket: AuthRateLimitBucket,
    identifier: string,
  ) => Promise<boolean>;
  clientIp: (request: Request) => string;
  /** Null when Buddy sends no email. */
  emailSender: () => BuddyEmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

export type Handler = (request: Request) => Promise<Response>;

export interface Context {
  db: BuddyDb;
  secret: string;
  origin: string;
  rpID: string;
  secure: boolean;
  now: Date;
  setCookies: string[];
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    code: string,
    headers: Record<string, string> = {},
  ) {
    super(code);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export const localeSchema = z.enum(["en", "zh"]).default("en");

export const tokenBody = z.object({ token: z.string().min(1).max(200) });

export function json(
  context: Pick<Context, "setCookies">,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  const headers = new Headers({
    ...extraHeaders,
    "Cache-Control": "no-store",
  });
  for (const cookie of context.setCookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { status, headers });
}

export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
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

export function issueChallenge(context: Context, payload: ChallengePayload) {
  context.setCookies.push(
    buddyChallengeCookie.serialize(
      buddyChallengeCookie.seal(payload, context.secret, context.now),
      context.secure,
    ),
  );
}

export function takeChallenge<P extends ChallengePayload["purpose"]>(
  request: Request,
  context: Context,
  purpose: P,
): Extract<ChallengePayload, { purpose: P }> {
  context.setCookies.push(buddyChallengeCookie.clear(context.secure));
  const value = readRequestCookie(request, buddyChallengeCookie.name);
  const payload = value
    ? buddyChallengeCookie.open(value, context.secret, context.now)
    : null;
  if (!payload || !hasPurpose(payload, purpose)) {
    throw new HttpError(400, "challenge_invalid");
  }
  return payload;
}

/** Stores a new session in `db` and sets its cookie on the response. */
export async function openSession(
  db: BuddyDb,
  request: Request,
  context: Context,
  userId: string,
) {
  const token = await createSession(db, {
    userId,
    userAgent: request.headers.get("User-Agent") ?? "",
    now: context.now,
  });
  context.setCookies.push(buddySessionCookie.serialize(token, context.secure));
}

const HOUR = 60 * 60;

/** The limit of each bucket, as Finance has them, in fixed windows. */
export const AUTH_RATE_LIMITS: Record<
  AuthRateLimitBucket,
  { limit: number; windowSeconds: number }
> = {
  auth: { limit: 10, windowSeconds: 60 },
  "recovery-email-ip": { limit: 10, windowSeconds: HOUR },
  "recovery-email-address": { limit: 3, windowSeconds: HOUR },
  "sign-up-ip": { limit: 10, windowSeconds: HOUR },
  "sign-up-address": { limit: 3, windowSeconds: HOUR },
};

export type AuthRouteKit = ReturnType<typeof makeAuthRouteKit>;

export function makeAuthRouteKit(deps: AuthHandlerDeps) {
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

  async function limit(bucket: AuthRateLimitBucket, identifier: string) {
    if (!(await deps.limitRequest(bucket, identifier))) {
      throw new HttpError(429, "rate_limited", {
        "Retry-After": String(AUTH_RATE_LIMITS[bucket].windowSeconds),
      });
    }
  }

  async function guardPost(request: Request): Promise<Context> {
    if (!isSameOrigin(request)) throw new HttpError(403, "forbidden_origin");
    await limit("auth", deps.clientIp(request));
    return prepareContext(request);
  }

  function handle(
    run: (request: Request, context: Context) => Promise<Response>,
    { method }: { method: "GET" | "POST" } = { method: "POST" },
  ): Handler {
    return async (request) => {
      let context: Context | null = null;
      try {
        context =
          method === "POST"
            ? await guardPost(request)
            : prepareContext(request);
        return await run(request, context);
      } catch (error) {
        if (error instanceof HttpError) {
          return json(
            { setCookies: context?.setCookies ?? [] },
            { error: error.code },
            error.status,
            error.headers,
          );
        }
        throw error;
      }
    };
  }

  function requireEmailSender(): BuddyEmailSender {
    const sender = deps.emailSender();
    if (!sender) throw new HttpError(503, "email_not_configured");
    return sender;
  }

  return {
    handle,
    limit,
    requireEmailSender,
    clientIp: deps.clientIp,
    afterResponse: deps.afterResponse,
    emailSender: deps.emailSender,
  };
}
