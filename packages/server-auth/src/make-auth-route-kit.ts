import { authJson } from "./auth-json.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { HttpError } from "./http-error.ts";
import { isSameOrigin } from "./is-same-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { retryAfterSeconds } from "./retry-after-seconds.ts";

export interface AuthRateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

export interface AuthRouteKitDeps<Db, Bucket extends string, EmailSender> {
  /** The app's name: the relying party name of its passkeys, and the start of its log lines. */
  appName: string;
  /** Null when the app has no database. */
  getDb: () => Db | null;
  now: () => Date;
  authSecret: () => string | undefined;
  isAllowedOrigin: (origin: string) => boolean;
  /** The WebAuthn relying party ID for a page at `hostname`. */
  passkeyRpId: (hostname: string) => string;
  clientIp: (request: Request) => string;
  /** The bucket that counts each POST by client IP. */
  postBucket: Bucket;
  limitRequest: (
    bucket: Bucket,
    identifier: string,
  ) => Promise<AuthRateLimitResult>;
  /** Gives back one request of `identifier` that `bucket` counted. */
  refundRequest: (bucket: Bucket, identifier: string) => Promise<void>;
  /** Null when the app sends no email. */
  emailSender: () => EmailSender | null;
  /** The refusal for an error of the app's own store, such as a unique key. */
  toHttpError?: (error: unknown) => HttpError | undefined;
}

export type AuthHandler = (request: Request) => Promise<Response>;

export interface AuthContext<Db> {
  appName: string;
  db: Db;
  secret: string;
  origin: string;
  rpID: string;
  secure: boolean;
  now: Date;
  setCookies: string[];
}

/** What every auth route of an app shares: the origin check, the rate limits, and the refusal as JSON. */
export function makeAuthRouteKit<Db, Bucket extends string, EmailSender>(
  deps: AuthRouteKitDeps<Db, Bucket, EmailSender>,
) {
  function prepareContext(request: Request): AuthContext<Db> {
    const db = deps.getDb();
    const secret = deps.authSecret();
    if (!db || !secret) throw new HttpError(503, "not_configured");
    const origin = getRequestOrigin(request);
    if (!deps.isAllowedOrigin(origin)) {
      throw new HttpError(403, "forbidden_origin");
    }
    return {
      appName: deps.appName,
      db,
      secret,
      origin,
      rpID: deps.passkeyRpId(new URL(origin).hostname),
      secure: needsSecureCookie(origin),
      now: deps.now(),
      setCookies: [],
    };
  }

  async function limit(bucket: Bucket, identifier: string) {
    let result: AuthRateLimitResult;
    try {
      result = await deps.limitRequest(bucket, identifier);
    } catch (error) {
      console.error(`${deps.appName} auth rate-limit error:`, error);
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
    limits: readonly (readonly [Bucket, string])[],
    task: () => Promise<T>,
  ): Promise<T> {
    const counted: (readonly [Bucket, string])[] = [];
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
            console.error(
              `${deps.appName} auth rate-limit refund error:`,
              refundError,
            );
          }
        }),
      );
      throw error;
    }
  }

  async function guardPost(request: Request): Promise<AuthContext<Db>> {
    if (!isSameOrigin(request)) throw new HttpError(403, "forbidden_origin");
    await limit(deps.postBucket, deps.clientIp(request));
    return prepareContext(request);
  }

  function toHttpError(error: unknown) {
    return error instanceof HttpError ? error : deps.toHttpError?.(error);
  }

  function handle(
    run: (request: Request, context: AuthContext<Db>) => Promise<Response>,
    { method }: { method: "GET" | "POST" } = { method: "POST" },
  ): AuthHandler {
    return async (request) => {
      let context: AuthContext<Db> | null = null;
      try {
        context =
          method === "POST"
            ? await guardPost(request)
            : prepareContext(request);
        return await run(request, context);
      } catch (error) {
        const refusal = toHttpError(error);
        if (refusal) {
          return authJson(
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

  function requireEmailSender(): EmailSender {
    const sender = deps.emailSender();
    if (!sender) throw new HttpError(503, "email_not_configured");
    return sender;
  }

  return { handle, limit, withLimits, requireEmailSender };
}
