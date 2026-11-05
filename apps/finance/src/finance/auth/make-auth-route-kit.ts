import { z } from "zod";
import { findPostgresError } from "#src/finance/db/find-postgres-error.ts";
import { VERIFIED_EMAIL_KEY } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { resolveClientIp } from "#src/http/resolve-client-ip.ts";
import type { FinanceEmailSender } from "../email/types.ts";
import { retryAfterSeconds } from "../http/check-rate-limit.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import type {
  FinanceRateLimitBucket,
  FinanceRateLimitResult,
  LimitFinanceRequest,
  RefundFinanceRequest,
} from "../http/types.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";

export interface AuthHandlerDeps {
  /** Null when finance has no database. */
  getDb: () => FinanceDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  limitRequest: LimitFinanceRequest;
  refundRequest: RefundFinanceRequest;
  isAllowedOrigin: (origin: string) => boolean;
  /** Null when Finance sends no email. */
  emailSender: () => FinanceEmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

export type Handler = (request: Request) => Promise<Response>;

export interface Context {
  db: FinanceDb;
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

/** The refusal to answer with for `error`. A second user with the same verified Recovery email is `email_registered`. */
function toHttpError(error: unknown): HttpError | undefined {
  if (error instanceof HttpError) return error;
  const postgres = findPostgresError(error);
  if (
    postgres?.code === "23505" &&
    postgres.constraint === VERIFIED_EMAIL_KEY
  ) {
    return new HttpError(409, "email_registered");
  }
  return undefined;
}

export const localeSchema = z.enum(["en", "zh"]).default("en");

export const tokenBody = z.object({ token: z.string().min(1) });

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

  async function limit(bucket: FinanceRateLimitBucket, identifier: string) {
    let result: FinanceRateLimitResult;
    try {
      result = await deps.limitRequest(bucket, identifier);
    } catch (error) {
      console.error("Finance auth rate-limit error:", error);
      throw new HttpError(503, "rate_limit_unavailable");
    }
    if (!result.success) {
      throw new HttpError(429, "rate_limited", {
        "Retry-After": String(retryAfterSeconds(result.reset, deps.now())),
      });
    }
  }

  /**
   * Runs `task` under each limit in `limits`. When a limit refuses, or
   * `task` fails, the limits give back what they counted, so a fault on the
   * server does not use up the visitor's tries.
   */
  async function withLimits<T>(
    limits: readonly (readonly [FinanceRateLimitBucket, string])[],
    task: () => Promise<T>,
  ): Promise<T> {
    const counted: (readonly [FinanceRateLimitBucket, string])[] = [];
    try {
      for (const [bucket, identifier] of limits) {
        await limit(bucket, identifier);
        counted.push([bucket, identifier]);
      }
      return await task();
    } catch (error) {
      await Promise.all(
        counted.map(async ([bucket, identifier]) => {
          try {
            await deps.refundRequest(bucket, identifier);
          } catch (refundError) {
            console.error("Finance auth rate-limit refund error:", refundError);
          }
        }),
      );
      throw error;
    }
  }

  async function guardPost(request: Request): Promise<Context> {
    if (!isSameOrigin(request)) throw new HttpError(403, "forbidden_origin");
    await limit("auth", resolveClientIp(request.headers));
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
        const refusal = toHttpError(error);
        if (refusal) {
          return json(
            { setCookies: context?.setCookies ?? [] },
            { error: refusal.code },
            refusal.status,
            refusal.headers,
          );
        }
        throw error;
      }
    };
  }

  function requireEmailSender(): FinanceEmailSender {
    const sender = deps.emailSender();
    if (!sender) throw new HttpError(503, "email_not_configured");
    return sender;
  }

  return { handle, limit, withLimits, requireEmailSender };
}
