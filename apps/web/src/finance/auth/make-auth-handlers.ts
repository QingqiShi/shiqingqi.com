import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { resolveClientIp } from "#src/app/api/pixel-creature-creator/lore/resolve-client-ip.ts";
import { findPostgresError } from "#src/finance/db/find-postgres-error.ts";
import { lookups } from "#src/finance/db/lookups.ts";
import { householdRepository } from "#src/finance/db/repositories/household-repository.ts";
import { memberRepository } from "#src/finance/db/repositories/member-repository.ts";
import {
  invites,
  passkeys,
  sessions,
  users,
  VERIFIED_EMAIL_KEY,
} from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import {
  asFinanceApp,
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "#src/finance/domain/dates/default-household-time-zone.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { buildRecoveryEmailChangedEmail } from "../email/build-recovery-email-changed-email.ts";
import { buildRecoveryEmail } from "../email/build-recovery-email.ts";
import { buildSignUpEmail } from "../email/build-sign-up-email.ts";
import { buildVerificationEmail } from "../email/build-verification-email.ts";
import { normaliseEmail } from "../email/normalise-email.ts";
import type { FinanceEmail, FinanceEmailSender } from "../email/types.ts";
import { retryAfterSeconds } from "../http/check-rate-limit.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import type {
  FinanceRateLimitBucket,
  FinanceRateLimitResult,
  LimitFinanceRequest,
  RefundFinanceRequest,
} from "../http/types.ts";
import { uuidToBytes } from "../ids/uuid-to-bytes.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";
import { createEmailRecoveryInvite } from "./create-email-recovery-invite.ts";
import { createHousehold } from "./create-household.ts";
import { createInvite } from "./create-invite.ts";
import { createSession } from "./create-session.ts";
import { defaultAccountGroups } from "./default-account-groups.ts";
import { deleteSession } from "./delete-session.ts";
import {
  financeChallengeCookie,
  type ChallengePayload,
} from "./finance-challenge-cookie.ts";
import {
  financeEmailCodeCookie,
  type EmailCodePayload,
} from "./finance-email-code-cookie.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { hashToken } from "./hash-token.ts";
import { isEmailRegistered } from "./is-email-registered.ts";
import { lookupInvite } from "./lookup-invite.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import {
  checkEmailCode,
  normaliseEmailCode,
  startEmailCode,
} from "./start-email-code.ts";
import {
  startEmailVerification,
  verifyRecoveryEmail,
} from "./start-email-verification.ts";
import { consumeSignUp, lookupSignUp, startSignUp } from "./start-sign-up.ts";
import type { FinanceSession } from "./types.ts";

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

type Handler = (request: Request) => Promise<Response>;

export interface AuthHandlers {
  signInOptions: Handler;
  signInVerify: Handler;
  requestSignUp: Handler;
  signUpCode: Handler;
  signUpOptions: Handler;
  signUpVerify: Handler;
  inviteOptions: Handler;
  inviteVerify: Handler;
  createInvite: Handler;
  passkeyOptions: Handler;
  passkeyVerify: Handler;
  recoveryEmail: Handler;
  setRecoveryEmail: Handler;
  verifyEmail: Handler;
  requestRecovery: Handler;
  recoveryCode: Handler;
  signOut: Handler;
  session: Handler;
}

const RP_NAME = "Finance";

interface Context {
  db: FinanceDb;
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

function isObjectWithId(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

const registrationResponseSchema =
  z.custom<RegistrationResponseJSON>(isObjectWithId);
const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(isObjectWithId);
const nameSchema = z.string().trim().min(1).max(100);

const localeSchema = z.enum(["en", "zh"]).default("en");
const currencySchema = z
  .string()
  .refine((code) => Intl.supportedValuesOf("currency").includes(code));

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
const inviteOptionsBody = z.object({
  token: z.string().min(1),
  email: z.string().max(320).optional(),
});
const tokenBody = z.object({ token: z.string().min(1) });
const verifyEmailBody = tokenBody.extend({ locale: localeSchema });
const inviteVerifyBody = z.object({
  token: z.string().min(1),
  response: registrationResponseSchema,
  email: z.string().max(320).optional(),
  locale: localeSchema,
});
const createInviteBody = z.object({ memberId: z.uuid() });
const registrationVerifyBody = z.object({
  response: registrationResponseSchema,
});
const authenticationVerifyBody = z.object({
  response: authenticationResponseSchema,
});
const codeBody = z.object({ code: z.string().max(20) });
const emailBody = z.object({
  email: z.string().max(320),
  locale: localeSchema,
});

function json(
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
      rpID: new URL(origin).hostname,
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

  async function requireSession(
    request: Request,
    context: Context,
  ): Promise<FinanceSession> {
    const token = readRequestCookie(request, financeSessionCookie.name);
    const resolved = token
      ? await resolveSession(context.db, token, {
          now: context.now,
          allowRefresh: true,
        })
      : null;
    if (!token || !resolved) throw new HttpError(401, "unauthorized");
    if (resolved.refreshed) {
      context.setCookies.push(
        financeSessionCookie.serialize(token, context.secure),
      );
    }
    return resolved.session;
  }

  function issueChallenge(context: Context, payload: ChallengePayload) {
    context.setCookies.push(
      financeChallengeCookie.serialize(
        financeChallengeCookie.seal(payload, context.secret, context.now),
        context.secure,
      ),
    );
  }

  function takeChallenge<P extends ChallengePayload["purpose"]>(
    request: Request,
    context: Context,
    purpose: P,
  ): Extract<ChallengePayload, { purpose: P }> {
    context.setCookies.push(financeChallengeCookie.clear(context.secure));
    const value = readRequestCookie(request, financeChallengeCookie.name);
    const payload = value
      ? financeChallengeCookie.open(value, context.secret, context.now)
      : null;
    if (!payload || !hasPurpose(payload, purpose)) {
      throw new HttpError(400, "challenge_invalid");
    }
    return payload;
  }

  function issueEmailCode(context: Context, payload: EmailCodePayload) {
    context.setCookies.push(
      financeEmailCodeCookie.serialize(
        financeEmailCodeCookie.seal(payload, context.secret, context.now),
        context.secure,
      ),
    );
  }

  /**
   * Checks a typed code against the emailed code that this browser asked
   * for, and returns the address it went to. A code that has ended clears
   * the cookie, so that the browser asks for a new one.
   */
  async function takeEmailCode(
    request: Request,
    context: Context,
    purpose: EmailCodePayload["purpose"],
    typed: string,
  ): Promise<string> {
    const value = readRequestCookie(request, financeEmailCodeCookie.name);
    const payload = value
      ? financeEmailCodeCookie.open(value, context.secret, context.now)
      : null;
    if (payload?.purpose !== purpose) {
      context.setCookies.push(financeEmailCodeCookie.clear(context.secure));
      throw new HttpError(410, "code_expired");
    }
    const code = normaliseEmailCode(typed);
    if (!code) throw new HttpError(400, "code_invalid");
    const result = await asFinanceApp(context.db, (db) =>
      checkEmailCode(db, {
        purpose,
        codeId: payload.codeId,
        code,
        now: context.now,
      }),
    );
    if (!result.ok && !result.ended) throw new HttpError(400, "code_invalid");
    context.setCookies.push(financeEmailCodeCookie.clear(context.secure));
    if (!result.ok) throw new HttpError(410, "code_expired");
    return result.email;
  }

  function startSession(context: Context, token: string) {
    context.setCookies.push(
      financeSessionCookie.serialize(token, context.secure),
    );
  }

  async function registrationOptions(
    context: Context,
    {
      userId,
      userName,
      excludeCredentials = [],
    }: {
      userId: string;
      userName: string;
      excludeCredentials?: { id: string; transports: string[] }[];
    },
  ) {
    return generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: context.rpID,
      userID: uuidToBytes(userId),
      userName,
      userDisplayName: userName,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    });
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
        "Finance passkey registration failed:",
        error instanceof Error ? error.message : error,
      );
    }
    throw new HttpError(400, "passkey_invalid");
  }

  type RegistrationInfo = Awaited<ReturnType<typeof verifyRegistration>>;

  async function revokeUserAccess(db: FinanceAppDb, userId: string) {
    await db.delete(passkeys).where(eq(passkeys.userId, userId));
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async function insertPasskey(
    db: FinanceAppDb,
    userId: string,
    { credential }: RegistrationInfo,
    now: Date,
  ) {
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
  }

  function requireEmailSender(): FinanceEmailSender {
    const sender = deps.emailSender();
    if (!sender) throw new HttpError(503, "email_not_configured");
    return sender;
  }

  async function sendOrFail(sender: FinanceEmailSender, email: FinanceEmail) {
    try {
      await sender.send(email);
    } catch (error) {
      console.error(`Finance email "${email.subject}" failed:`, error);
      throw new HttpError(502, "email_failed");
    }
  }

  async function readEmail(request: Request) {
    const body = await readBody(request, emailBody);
    const email = normaliseEmail(body.email);
    if (!email) throw new HttpError(400, "email_invalid");
    return { email, locale: body.locale };
  }

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

  /** The email that a new-member invite needs. Null for a recovery invite, whose user keeps the email it has. */
  function inviteEmail(recovery: boolean, given: string | undefined) {
    if (recovery) return null;
    const email = normaliseEmail(given ?? "");
    if (!email) throw new HttpError(400, "email_invalid");
    return email;
  }

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
      return { path: `/finance/invite/${recoveryToken}`, registered: true };
    }
    // A new link for the address ends the emailed one, so that one
    // request makes at most one User.
    const token = await startSignUp(db, { email, now });
    return { path: `/finance/sign-up/${token}`, registered: false };
  }

  function hashedAddress(email: string) {
    return Buffer.from(hashToken(email)).toString("hex");
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
        return createSession(db, {
          userId: passkey.userId,
          userAgent: request.headers.get("User-Agent") ?? "",
          now,
        });
      });
      startSession(context, token);
      return json(context, { ok: true });
    }),

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
          const content = {
            to: email,
            locale,
            code,
            url: `${origin}${getLocalePath(path, locale)}`,
          };
          await sendOrFail(
            sender,
            registered
              ? buildRecoveryEmail({ ...content, reason: "sign-up" })
              : buildSignUpEmail(content),
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
        const token = await createSession(tx, {
          userId,
          userAgent: request.headers.get("User-Agent") ?? "",
          now,
        });
        return { householdId, memberId, token };
      });

      startSession(context, result.token);
      return json(context, {
        householdId: result.householdId,
        memberId: result.memberId,
      });
    }),

    inviteOptions: handle(async (request, context) => {
      const body = await readBody(request, inviteOptionsBody);
      const invite = await lookupInvite(context.db, body.token, context.now);
      if (!invite) throw new HttpError(410, "invite_invalid");
      inviteEmail(invite.recoveryUserId !== null, body.email);

      const userId = invite.recoveryUserId ?? randomUUID();
      const options = await registrationOptions(context, {
        userId,
        userName: invite.memberName,
      });
      issueChallenge(context, {
        purpose: "invite",
        challenge: options.challenge,
        userId,
        inviteId: invite.inviteId,
      });
      return json(context, {
        options,
        householdName: invite.householdName,
        memberName: invite.memberName,
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
      const email = inviteEmail(invite.recoveryUserId !== null, body.email);
      const info = await verifyRegistration(context, body.response, challenge);

      const { token, verification } = await withHousehold(
        context.db,
        invite.householdId,
        async (scope) => {
          const { db } = scope;
          const used = await db
            .update(invites)
            .set({ usedAt: now })
            .where(
              and(
                eq(invites.householdId, invite.householdId),
                eq(invites.id, inviteId),
                isNull(invites.usedAt),
                gt(invites.expiresAt, now),
              ),
            )
            .returning({ id: invites.id });
          if (used.length === 0) throw new HttpError(410, "invite_invalid");

          if (invite.recoveryUserId !== null) {
            // The Member lost every passkey. A lost device must not keep
            // access, so its passkeys and sessions stop here.
            await revokeUserAccess(db, userId);
            await insertPasskey(db, userId, info, now);
            return {
              token: await createSession(db, {
                userId,
                userAgent: request.headers.get("User-Agent") ?? "",
                now,
              }),
              verification: null,
            };
          }

          await db
            .insert(users)
            .values({ id: userId, displayName: invite.memberName });
          const bound = await bindUserToMember(scope, {
            memberId: invite.memberId,
            userId,
          });
          if (!bound) throw new HttpError(409, "member_claimed");
          await insertPasskey(db, userId, info, now);
          return {
            token: await createSession(db, {
              userId,
              userAgent: request.headers.get("User-Agent") ?? "",
              now,
            }),
            verification:
              email === null
                ? null
                : {
                    email,
                    token: await startEmailVerification(db, {
                      userId,
                      email,
                      now,
                    }),
                  },
          };
        },
      );

      startSession(context, token);
      const sender = deps.emailSender();
      if (verification && sender) {
        const url = `${context.origin}${getLocalePath(`/finance/verify-email/${verification.token}`, body.locale)}`;
        deps.afterResponse(async () => {
          try {
            await sender.send(
              buildVerificationEmail({
                to: verification.email,
                locale: body.locale,
                url,
              }),
            );
          } catch (error) {
            console.error("Finance verification email failed:", error);
          }
        });
      }
      return json(context, {
        householdId: invite.householdId,
        memberId: invite.memberId,
      });
    }),

    createInvite: handle(async (request, context) => {
      const session = await requireSession(request, context);
      const { memberId } = await readBody(request, createInviteBody);
      const result = await withHousehold(
        context.db,
        session.householdId,
        (scope) =>
          createInvite(scope, {
            memberId,
            createdBy: session.userId,
            allowRecovery: session.role === "owner",
            now: context.now,
          }),
      );
      if (!result.ok) {
        throw new HttpError(
          { member_not_found: 404, member_claimed: 409, owner_only: 403 }[
            result.reason
          ],
          result.reason,
        );
      }
      return json(
        context,
        {
          token: result.token,
          path: `/finance/invite/${result.token}`,
          expiresAt: result.expiresAt.toISOString(),
          recovery: result.recovery,
        },
        201,
      );
    }),

    passkeyOptions: handle(async (request, context) => {
      const session = await requireSession(request, context);
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
      const session = await requireSession(request, context);
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

    recoveryEmail: handle(
      async (request, context) => {
        const session = await requireSession(request, context);
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
      const session = await requireSession(request, context);
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
            url: `${context.origin}${getLocalePath(`/finance/verify-email/${token}`, locale)}`,
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
                settingsUrl: `${origin}${getLocalePath("/finance/settings/members", locale)}`,
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
            buildRecoveryEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(`/finance/invite/${token}`, locale)}`,
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
      return json(context, { path: `/finance/invite/${token}` });
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
        const session = await requireSession(request, context);
        return json(context, {
          userId: session.userId,
          householdId: session.householdId,
          memberId: session.memberId,
          role: session.role,
        });
      },
      { method: "GET" },
    ),
  };
}
