import { randomUUID } from "node:crypto";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { z } from "zod";
import { authBodies, type AuthLocale } from "./auth-bodies.ts";
import {
  authChallenges,
  type AuthChallengePayload,
} from "./auth-challenges.ts";
import { authJson } from "./auth-json.ts";
import { hashToken } from "./hash-token.ts";
import { HttpError } from "./http-error.ts";
import {
  makeAuthRouteKit,
  type AuthContext,
  type AuthRouteKitDeps,
} from "./make-auth-route-kit.ts";
import type { AuthStore, AuthTx, EmailCodePurpose } from "./make-auth-store.ts";
import { makeChallenge, type ChallengeCookie } from "./make-challenge.ts";
import type {
  EmailCodePayload,
  makeEmailCodeCookie,
} from "./make-email-code-cookie.ts";
import { normaliseEmailCode } from "./normalise-email-code.ts";
import { normaliseEmail } from "./normalise-email.ts";
import { passkeyRegistrationOptions } from "./passkey-registration-options.ts";
import { passkeyResponseSchemas } from "./passkey-response-schemas.ts";
import { readAuthBody } from "./read-auth-body.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { verifyPasskeyRegistration } from "./verify-passkey-registration.ts";
import { verifyPasskeySignIn } from "./verify-passkey-sign-in.ts";

/** A group of auth routes that share one rate limit. */
export type AuthRateLimitBucket =
  | "auth"
  | "recovery-email-ip"
  | "recovery-email-address"
  | "sign-up-ip"
  | "sign-up-address";

const signInVerifyBody = z.object({
  response: passkeyResponseSchemas.authentication,
});
const addPasskeyVerifyBody = z.object({
  response: passkeyResponseSchemas.registration,
});
const signUpVerifyBody = z.looseObject({
  ...authBodies.token.shape,
  response: passkeyResponseSchemas.registration,
});

interface SessionCookie {
  name: string;
  maxAgeSeconds: number;
  serialize(token: string, secure: boolean, maxAgeSeconds?: number): string;
  clear(secure: boolean): string;
}

interface EmailSender<Email> {
  send: (email: Email) => Promise<void>;
}

export interface AuthConfig<
  Db,
  Tx extends AuthTx,
  ExtraBucket extends string,
  Email extends { subject: string },
  SignUpFields,
> extends AuthRouteKitDeps<
  Db,
  AuthRateLimitBucket | ExtraBucket,
  EmailSender<Email>
> {
  /** The statements of sign-in on the app's tables. */
  store: AuthStore;
  /**
   * Runs `run` in a transaction of the app. The app chooses the database
   * role here, so every statement of sign-in runs under the app's row level
   * security.
   */
  transaction: <T>(db: Db, run: (tx: Tx) => Promise<T>) => Promise<T>;
  sessionCookie: SessionCookie;
  /** Its payload union has `authChallenges` and the app's own ceremonies. */
  challengeCookie: ChallengeCookie<AuthChallengePayload>;
  emailCodeCookie: ReturnType<typeof makeEmailCodeCookie>;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
  /** The email that carries a code and its link. */
  buildCodeEmail: (input: {
    to: string;
    locale: AuthLocale;
    code: string;
    url: string;
    reason: "recovery" | "sign-up" | "registered-sign-up";
  }) => Email;
  /** True when a user has `email`. */
  isEmailRegistered: (tx: Tx, email: string) => Promise<boolean>;
  /**
   * Makes a recovery link when a user has `email`, and returns its path.
   * Null when no user has it. `replaceEmailed` is false when the link is
   * for the browser that typed the code, so the emailed link stays good.
   */
  startRecovery: (
    tx: Tx,
    input: { email: string; now: Date; replaceEmailed: boolean },
  ) => Promise<string | null>;
  /** What the app reads from the last request of a sign-up, beside the link's token and the passkey. */
  signUpFields: z.ZodType<SignUpFields>;
  /** Makes the user with id `userId` and all that the app gives a new user. Returns the body of the answer. */
  createUser: (
    tx: Tx,
    input: { userId: string; email: string; now: Date; fields: SignUpFields },
  ) => Promise<Record<string, unknown>>;
  /** Runs when a passkey is good, before the session opens. A refusal ends the sign-in. Returns the body of the answer. */
  signIn: (tx: Tx, userId: string) => Promise<Record<string, unknown>>;
}

/**
 * Sign-in for an app: the routes of sign-in, sign-out, sign-up by an emailed
 * code, and the emailed code that starts a recovery; and the parts that the
 * app's own auth routes build on.
 */
export function makeAuth<
  Db,
  Tx extends AuthTx,
  ExtraBucket extends string,
  Email extends { subject: string },
  SignUpFields,
>(config: AuthConfig<Db, Tx, ExtraBucket, Email, SignUpFields>) {
  type Context = AuthContext<Db>;
  const kit = makeAuthRouteKit(config);
  const { handle, limit, withLimits, requireEmailSender } = kit;
  const challenge = makeChallenge(config.challengeCookie);
  const { store, transaction, sessionCookie, emailCodeCookie } = config;

  function issueEmailCode(context: Context, payload: EmailCodePayload) {
    context.setCookies.push(
      emailCodeCookie.serialize(
        emailCodeCookie.seal(payload, context.secret, context.now),
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
    purpose: EmailCodePurpose,
    typed: string,
  ): Promise<string> {
    const value = readRequestCookie(request, emailCodeCookie.name);
    const payload = value
      ? emailCodeCookie.open(value, context.secret, context.now)
      : null;
    if (payload?.purpose !== purpose) {
      context.setCookies.push(emailCodeCookie.clear(context.secure));
      throw new HttpError(410, "code_expired");
    }
    const code = normaliseEmailCode(typed);
    if (!code) throw new HttpError(400, "code_invalid");
    const result = await transaction(context.db, (tx) =>
      store.checkEmailCode(tx, {
        purpose,
        codeId: payload.codeId,
        code,
        now: context.now,
      }),
    );
    if (!result.ok && !result.ended) throw new HttpError(400, "code_invalid");
    context.setCookies.push(emailCodeCookie.clear(context.secure));
    if (!result.ok) throw new HttpError(410, "code_expired");
    return result.email;
  }

  async function sendOrFail(sender: EmailSender<Email>, email: Email) {
    try {
      await sender.send(email);
    } catch (error) {
      console.error(
        `${config.appName} email "${email.subject}" failed:`,
        error,
      );
      throw new HttpError(502, "email_failed");
    }
  }

  async function readEmail(request: Request) {
    const body = await readAuthBody(request, authBodies.email);
    const email = normaliseEmail(body.email);
    if (!email) throw new HttpError(400, "email_invalid");
    return { email, locale: body.locale };
  }

  function hashedAddress(email: string) {
    return Buffer.from(hashToken(email)).toString("hex");
  }

  /** Stores a new session of the user and returns its raw token. */
  function createSession(
    tx: Tx,
    request: Request,
    context: Context,
    userId: string,
    maxAgeSeconds = sessionCookie.maxAgeSeconds,
  ): Promise<string> {
    return store.createSession(tx, {
      userId,
      userAgent: request.headers.get("User-Agent") ?? "",
      now: context.now,
      maxAgeSeconds,
    });
  }

  /**
   * Sets the session cookie on the answer. Call it after the transaction
   * that stored the session, so that a failed transaction sets no cookie.
   */
  function startSession(
    context: Context,
    token: string,
    maxAgeSeconds = sessionCookie.maxAgeSeconds,
  ) {
    context.setCookies.push(
      sessionCookie.serialize(token, context.secure, maxAgeSeconds),
    );
  }

  /**
   * Makes a recovery link when a user has `email`, and else starts a
   * sign-up. Returns the path of the new link.
   */
  async function startSignUpOrRecovery(
    tx: Tx,
    input: { email: string; now: Date; replaceEmailed: boolean },
  ): Promise<{ path: string; registered: boolean }> {
    const recoveryPath = await config.startRecovery(tx, input);
    if (recoveryPath !== null) return { path: recoveryPath, registered: true };
    // A new link for the address ends the emailed one, so that one
    // request makes at most one user.
    const token = await store.startSignUp(tx, input);
    return { path: `/sign-up/${token}`, registered: false };
  }

  const handlers = {
    signInOptions: handle(async (_request, context) => {
      const options = await generateAuthenticationOptions({
        rpID: context.rpID,
        userVerification: "preferred",
      });
      challenge.issue(context, {
        purpose: "sign-in",
        challenge: options.challenge,
      });
      return authJson(context, { options });
    }),

    signInVerify: handle(async (request, context) => {
      const { response } = await readAuthBody(request, signInVerifyBody);
      const taken = challenge.take(request, context, authChallenges.signIn);
      const { db, now } = context;

      const passkey = await transaction(db, (tx) =>
        store.findPasskey(tx, response.id),
      );
      if (!passkey) throw new HttpError(401, "passkey_unknown");
      const counter = await verifyPasskeySignIn(context, {
        response,
        challenge: taken.challenge,
        passkey,
      });

      const { body, token } = await transaction(db, async (tx) => {
        const answer = await config.signIn(tx, passkey.userId);
        await store.markPasskeyUsed(tx, passkey.id, { counter, now });
        return {
          body: answer,
          token: await createSession(tx, request, context, passkey.userId),
        };
      });
      startSession(context, token);
      return authJson(context, body);
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, sessionCookie.name);
      if (token) {
        await transaction(context.db, (tx) => store.deleteSession(tx, token));
      }
      context.setCookies.push(sessionCookie.clear(context.secure));
      return authJson(context, { ok: true });
    }),

    requestSignUp: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await withLimits(
        [
          ["sign-up-ip", config.clientIp(request)],
          ["sign-up-address", hashedAddress(email)],
        ],
        async () => {
          const { now, origin } = context;
          const { path, registered, codeId, code } = await transaction(
            context.db,
            async (tx) => ({
              ...(await startSignUpOrRecovery(tx, {
                email,
                now,
                replaceEmailed: true,
              })),
              ...(await store.startEmailCode(tx, {
                purpose: "sign-up",
                email,
                now,
              })),
            }),
          );
          await sendOrFail(
            sender,
            config.buildCodeEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(path, locale)}`,
              reason: registered ? "registered-sign-up" : "sign-up",
            }),
          );
          issueEmailCode(context, { purpose: "sign-up", codeId });
        },
      );
      return authJson(context, { ok: true }, 202);
    }),

    signUpCode: handle(async (request, context) => {
      const { code } = await readAuthBody(request, authBodies.code);
      const email = await takeEmailCode(request, context, "sign-up", code);
      const { path } = await transaction(context.db, (tx) =>
        startSignUpOrRecovery(tx, {
          email,
          now: context.now,
          replaceEmailed: false,
        }),
      );
      return authJson(context, { path });
    }),

    signUpOptions: handle(async (request, context) => {
      const { token } = await readAuthBody(request, authBodies.token);
      const signUp = await transaction(context.db, async (tx) => {
        const open = await store.lookupSignUp(tx, token, context.now);
        if (!open) throw new HttpError(410, "sign_up_invalid");
        if (await config.isEmailRegistered(tx, open.email)) {
          throw new HttpError(409, "email_registered");
        }
        return open;
      });

      const userId = randomUUID();
      const options = await passkeyRegistrationOptions(context, {
        userId,
        userName: signUp.email,
      });
      challenge.issue(context, {
        purpose: "sign-up",
        challenge: options.challenge,
        userId,
        signUpId: signUp.signUpId,
      });
      return authJson(context, { options, email: signUp.email });
    }),

    signUpVerify: handle(async (request, context) => {
      const body = await readAuthBody(request, signUpVerifyBody);
      const fields = config.signUpFields.safeParse(body);
      if (!fields.success) throw new HttpError(400, "invalid_body");
      const {
        challenge: expected,
        userId,
        signUpId,
      } = challenge.take(request, context, authChallenges.signUp);
      const { db, now } = context;
      const signUp = await transaction(db, (tx) =>
        store.lookupSignUp(tx, body.token, now),
      );
      if (signUp?.signUpId !== signUpId) {
        throw new HttpError(410, "sign_up_invalid");
      }
      const credential = await verifyPasskeyRegistration(
        context,
        body.response,
        expected,
      );

      const { answer, token } = await transaction(db, async (tx) => {
        if (!(await store.consumeSignUp(tx, { signUpId, now }))) {
          throw new HttpError(410, "sign_up_invalid");
        }
        if (await config.isEmailRegistered(tx, signUp.email)) {
          throw new HttpError(409, "email_registered");
        }
        const created = await config.createUser(tx, {
          userId,
          email: signUp.email,
          now,
          fields: fields.data,
        });
        await store.insertPasskey(tx, userId, credential, now);
        return {
          answer: created,
          token: await createSession(tx, request, context, userId),
        };
      });
      startSession(context, token);
      return authJson(context, answer);
    }),

    requestRecovery: handle(async (request, context) => {
      const { email, locale } = await readEmail(request);
      const sender = requireEmailSender();
      await limit("recovery-email-ip", config.clientIp(request));
      await limit("recovery-email-address", hashedAddress(email));
      const { db, now, origin } = context;
      const { codeId, code } = await transaction(db, (tx) =>
        store.startEmailCode(tx, { purpose: "recovery", email, now }),
      );
      issueEmailCode(context, { purpose: "recovery", codeId });
      // The response must be the same when no user has this email. Thus the
      // search and the email occur after the response.
      config.afterResponse(async () => {
        try {
          const path = await transaction(db, (tx) =>
            config.startRecovery(tx, { email, now, replaceEmailed: true }),
          );
          if (path === null) return;
          await sender.send(
            config.buildCodeEmail({
              to: email,
              locale,
              code,
              url: `${origin}${getLocalePath(path, locale)}`,
              reason: "recovery",
            }),
          );
        } catch (error) {
          console.error(`${config.appName} recovery email failed:`, error);
        }
      });
      return authJson(context, { ok: true }, 202);
    }),

    recoveryCode: handle(async (request, context) => {
      const { code } = await readAuthBody(request, authBodies.code);
      const email = await takeEmailCode(request, context, "recovery", code);
      const path = await transaction(context.db, (tx) =>
        config.startRecovery(tx, {
          email,
          now: context.now,
          replaceEmailed: false,
        }),
      );
      if (path === null) throw new HttpError(410, "code_expired");
      return authJson(context, { path });
    }),
  };

  /** The routes that save one more passkey for the user that is signed in. */
  function addPasskeyHandlers<User extends { userId: string }>(hooks: {
    /** The user that is signed in. Refuses a request with no session. */
    requireUser: (request: Request, context: Context) => Promise<User>;
    /** The name that the passkey shows on the user's device. */
    passkeyName: (context: Context, user: User) => Promise<string>;
  }) {
    return {
      passkeyOptions: handle(async (request, context) => {
        const user = await hooks.requireUser(request, context);
        const userName = await hooks.passkeyName(context, user);
        const existing = await transaction(context.db, (tx) =>
          store.listPasskeys(tx, user.userId),
        );
        const options = await passkeyRegistrationOptions(context, {
          userId: user.userId,
          userName,
          excludeCredentials: existing,
        });
        challenge.issue(context, {
          purpose: "add-passkey",
          challenge: options.challenge,
          userId: user.userId,
        });
        return authJson(context, { options });
      }),

      passkeyVerify: handle(async (request, context) => {
        const { userId } = await hooks.requireUser(request, context);
        const { response } = await readAuthBody(request, addPasskeyVerifyBody);
        const taken = challenge.take(
          request,
          context,
          authChallenges.addPasskey,
        );
        if (taken.userId !== userId) {
          throw new HttpError(400, "challenge_invalid");
        }
        const credential = await verifyPasskeyRegistration(
          context,
          response,
          taken.challenge,
        );
        await transaction(context.db, (tx) =>
          store.insertPasskey(tx, userId, credential, context.now),
        );
        return authJson(context, { ok: true });
      }),
    };
  }

  return {
    ...kit,
    handlers,
    addPasskeyHandlers,
    sendOrFail,
    readEmail,
    createSession,
    startSession,
  };
}
