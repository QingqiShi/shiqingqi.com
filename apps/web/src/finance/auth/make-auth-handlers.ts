import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { resolveClientIp } from "#src/app/api/pixel-creature-creator/lore/resolve-client-ip.ts";
import {
  invites,
  members,
  passkeys,
  sessions,
  users,
} from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { isSameOrigin } from "../http/is-same-origin.ts";
import type {
  FinanceRateLimitResult,
  LimitFinanceRequest,
} from "../http/types.ts";
import { uuidToBytes } from "../ids/uuid-to-bytes.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";
import { constantTimeEqual } from "./constant-time-equal.ts";
import { createHousehold } from "./create-household.ts";
import { createInvite } from "./create-invite.ts";
import { createSession } from "./create-session.ts";
import { deleteSession } from "./delete-session.ts";
import {
  financeChallengeCookie,
  type ChallengePayload,
} from "./finance-challenge-cookie.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { getSetupState } from "./get-setup-state.ts";
import { lookupInvite } from "./lookup-invite.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FinanceSession } from "./types.ts";

export interface AuthHandlerDeps {
  /** Null when finance has no database. */
  getDb: () => FinanceDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  setupSecret: () => string | undefined;
  limitRequest: LimitFinanceRequest;
  isAllowedOrigin: (origin: string) => boolean;
}

type Handler = (request: Request) => Promise<Response>;

export interface AuthHandlers {
  signInOptions: Handler;
  signInVerify: Handler;
  setupOptions: Handler;
  setupVerify: Handler;
  inviteOptions: Handler;
  inviteVerify: Handler;
  createInvite: Handler;
  passkeyOptions: Handler;
  passkeyVerify: Handler;
  signOut: Handler;
  session: Handler;
}

const RP_NAME = "Finance";
const SETUP_LOCK_KEY = 7_316_045_221;

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

const registrationResponseSchema =
  z.custom<RegistrationResponseJSON>(isObjectWithId);
const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(isObjectWithId);
const nameSchema = z.string().trim().min(1).max(100);

const setupOptionsBody = z.object({
  setupSecret: z.string(),
  memberName: nameSchema.optional(),
});
const setupVerifyBody = z.object({
  setupSecret: z.string(),
  response: registrationResponseSchema,
  householdName: nameSchema.optional(),
  memberName: nameSchema.optional(),
});
const inviteOptionsBody = z.object({ token: z.string().min(1) });
const inviteVerifyBody = z.object({
  token: z.string().min(1),
  response: registrationResponseSchema,
});
const createInviteBody = z.object({ memberId: z.uuid() });
const registrationVerifyBody = z.object({
  response: registrationResponseSchema,
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

  async function guardPost(request: Request): Promise<Context> {
    if (!isSameOrigin(request)) throw new HttpError(403, "forbidden_origin");
    let limit: FinanceRateLimitResult;
    try {
      limit = await deps.limitRequest("auth", resolveClientIp(request.headers));
    } catch (error) {
      console.error("Finance auth rate-limit error:", error);
      throw new HttpError(503, "rate_limit_unavailable");
    }
    if (!limit.success) throw new HttpError(429, "rate_limited");
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

  async function revokeUserAccess(db: FinanceDb, userId: string) {
    await db.delete(passkeys).where(eq(passkeys.userId, userId));
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async function insertPasskey(
    db: FinanceDb,
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

  function checkSetupSecret(given: string) {
    const expected = deps.setupSecret();
    if (!expected || !constantTimeEqual(given, expected)) {
      throw new HttpError(403, "setup_forbidden");
    }
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
      const { db, now } = context;

      const passkey = (
        await db
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
          "Finance passkey sign-in failed:",
          error instanceof Error ? error.message : error,
        );
        throw new HttpError(401, "passkey_invalid");
      }

      const membership = (
        await db
          .select({ id: members.id })
          .from(members)
          .where(
            and(eq(members.userId, passkey.userId), isNull(members.deletedAt)),
          )
          .limit(1)
      ).at(0);
      if (!membership) throw new HttpError(403, "no_membership");

      await db
        .update(passkeys)
        .set({ counter: newCounter, lastUsedAt: now })
        .where(eq(passkeys.id, passkey.id));
      startSession(
        context,
        await createSession(db, {
          userId: passkey.userId,
          userAgent: request.headers.get("User-Agent") ?? "",
          now,
        }),
      );
      return json(context, { ok: true });
    }),

    setupOptions: handle(async (request, context) => {
      const body = await readBody(request, setupOptionsBody);
      checkSetupSecret(body.setupSecret);
      const state = await getSetupState(context.db);
      if (state.mode === "closed") throw new HttpError(403, "setup_closed");

      const userId = state.mode === "recover" ? state.userId : randomUUID();
      const options = await registrationOptions(context, {
        userId,
        userName:
          state.mode === "create"
            ? (body.memberName ?? "Owner")
            : state.memberName,
      });
      issueChallenge(context, {
        purpose: "setup",
        challenge: options.challenge,
        userId,
        mode: state.mode,
      });
      return json(context, {
        options,
        mode: state.mode,
        ...(state.mode === "create"
          ? {}
          : {
              householdName: state.householdName,
              memberName: state.memberName,
            }),
      });
    }),

    setupVerify: handle(async (request, context) => {
      const body = await readBody(request, setupVerifyBody);
      checkSetupSecret(body.setupSecret);
      const { challenge, userId, mode } = takeChallenge(
        request,
        context,
        "setup",
      );
      const info = await verifyRegistration(context, body.response, challenge);
      const { now } = context;

      const result = await context.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(${SETUP_LOCK_KEY})`);
        const state = await getSetupState(tx);
        if (
          state.mode === "closed" ||
          state.mode !== mode ||
          (state.mode === "recover" && state.userId !== userId)
        ) {
          throw new HttpError(403, "setup_closed");
        }

        let householdId: string;
        let memberId: string;
        if (state.mode === "recover") {
          // The owner lost every passkey. A lost device must not keep
          // access, so its passkeys and sessions stop here.
          await revokeUserAccess(tx, userId);
          householdId = state.householdId;
          memberId = state.memberId;
        } else if (state.mode === "create") {
          const memberName = body.memberName ?? "Owner";
          memberId = randomUUID();
          await tx
            .insert(users)
            .values({ id: userId, displayName: memberName });
          const created = await createHousehold(tx, {
            name: body.householdName ?? "Household",
            members: [
              { id: memberId, name: memberName, role: "owner", userId },
            ],
          });
          householdId = created.householdId;
        } else {
          await tx
            .insert(users)
            .values({ id: userId, displayName: state.memberName });
          if (
            !(await bindUserToMember(tx, {
              householdId: state.householdId,
              memberId: state.memberId,
              userId,
            }))
          ) {
            throw new HttpError(409, "member_claimed");
          }
          householdId = state.householdId;
          memberId = state.memberId;
        }
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
      const { token } = await readBody(request, inviteOptionsBody);
      const invite = await lookupInvite(context.db, token, context.now);
      if (!invite) throw new HttpError(410, "invite_invalid");

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
      const { db, now } = context;
      const invite = await lookupInvite(db, body.token, now);
      if (
        !invite ||
        invite.inviteId !== inviteId ||
        (invite.recoveryUserId !== null && invite.recoveryUserId !== userId)
      ) {
        throw new HttpError(410, "invite_invalid");
      }
      const info = await verifyRegistration(context, body.response, challenge);

      const token = await db.transaction(async (tx) => {
        const used = await tx
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

        if (invite.recoveryUserId !== null) {
          // The Member lost every passkey. A lost device must not keep
          // access, so its passkeys and sessions stop here.
          await revokeUserAccess(tx, userId);
          await insertPasskey(tx, userId, info, now);
          return createSession(tx, {
            userId,
            userAgent: request.headers.get("User-Agent") ?? "",
            now,
          });
        }

        await tx
          .insert(users)
          .values({ id: userId, displayName: invite.memberName });
        if (
          !(await bindUserToMember(tx, {
            householdId: invite.householdId,
            memberId: invite.memberId,
            userId,
          }))
        ) {
          throw new HttpError(409, "member_claimed");
        }
        await insertPasskey(tx, userId, info, now);
        return createSession(tx, {
          userId,
          userAgent: request.headers.get("User-Agent") ?? "",
          now,
        });
      });

      startSession(context, token);
      return json(context, {
        householdId: invite.householdId,
        memberId: invite.memberId,
      });
    }),

    createInvite: handle(async (request, context) => {
      const session = await requireSession(request, context);
      const { memberId } = await readBody(request, createInviteBody);
      const result = await createInvite(context.db, {
        householdId: session.householdId,
        memberId,
        createdBy: session.userId,
        allowRecovery: session.role === "owner",
        now: context.now,
      });
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
      const member = (
        await context.db
          .select({ name: members.name })
          .from(members)
          .where(eq(members.id, session.memberId))
          .limit(1)
      ).at(0);
      const existing = await context.db
        .select({ id: passkeys.id, transports: passkeys.transports })
        .from(passkeys)
        .where(eq(passkeys.userId, session.userId))
        .orderBy(asc(passkeys.createdAt));
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
      await insertPasskey(context.db, session.userId, info, context.now);
      return json(context, { ok: true });
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, financeSessionCookie.name);
      if (token) await deleteSession(context.db, token);
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
