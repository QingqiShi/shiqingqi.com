import { authBodies, type AuthLocale } from "./auth-bodies.ts";
import { authJson } from "./auth-json.ts";
import { HttpError } from "./http-error.ts";
import type { AuthContext, AuthHandler } from "./make-auth-route-kit.ts";
import type { AuthStore, AuthTx } from "./make-auth-store.ts";
import type { AuthRateLimitBucket } from "./make-auth.ts";
import type { makeEmailCode } from "./make-email-code.ts";
import { readAuthBody } from "./read-auth-body.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import type { CodeEmailInput } from "./types.ts";

export interface EmailChangeHooks<Context, Tx> {
  /** The user that is signed in. Refuses a request with no session. */
  requireUser: (
    request: Request,
    context: Context,
  ) => Promise<{ userId: string }>;
  /** Gives the user `email`. False when another user has it. */
  changeEmail: (
    tx: Tx,
    input: { userId: string; email: string },
  ) => Promise<boolean>;
}

interface EmailChangeDeps<Db, Tx extends AuthTx, Email, Sender> {
  handle: (
    run: (request: Request, context: AuthContext<Db>) => Promise<Response>,
  ) => AuthHandler;
  withLimits: <T>(
    limits: readonly (readonly [AuthRateLimitBucket, string])[],
    task: () => Promise<T>,
  ) => Promise<T>;
  requireEmailSender: () => Sender;
  sendOrFail: (sender: Sender, email: Email) => Promise<void>;
  readEmail: (
    request: Request,
  ) => Promise<{ email: string; locale: AuthLocale }>;
  hashedAddress: (email: string) => string;
  emailCode: ReturnType<typeof makeEmailCode<Db>>;
  config: {
    clientIp: (request: Request) => string;
    buildCodeEmail: (input: CodeEmailInput) => Email;
    store: AuthStore;
    transaction: <T>(db: Db, run: (tx: Tx) => Promise<T>) => Promise<T>;
    sessionCookie: { name: string };
  };
}

/**
 * The routes that set or change the email of the user that is signed in: a
 * code goes to the new address, and the user types it in the browser that
 * asked for it.
 */
export function makeEmailChangeHandlers<Db, Tx extends AuthTx, Email, Sender>(
  deps: EmailChangeDeps<Db, Tx, Email, Sender>,
  hooks: EmailChangeHooks<AuthContext<Db>, Tx>,
) {
  const { handle, emailCode, config } = deps;
  const { store, transaction } = config;
  return {
    emailRequest: handle(async (request, context) => {
      const { userId } = await hooks.requireUser(request, context);
      const { email, locale } = await deps.readEmail(request);
      const sender = deps.requireEmailSender();
      // The sign-up limits also count these codes, so that one address gets
      // no more codes from the two flows together.
      await deps.withLimits(
        [
          ["sign-up-ip", config.clientIp(request)],
          ["sign-up-address", deps.hashedAddress(email)],
        ],
        async () => {
          const { codeId, code } = await transaction(context.db, (tx) =>
            store.startEmailCode(tx, {
              purpose: "email-change",
              email,
              now: context.now,
            }),
          );
          await deps.sendOrFail(
            sender,
            config.buildCodeEmail({
              to: email,
              locale,
              code,
              reason: "email-change",
            }),
          );
          emailCode.issue(context, { purpose: "email-change", codeId, userId });
        },
      );
      return authJson(context, { ok: true }, 202);
    }),

    emailVerify: handle(async (request, context) => {
      const { userId } = await hooks.requireUser(request, context);
      const { code } = await readAuthBody(request, authBodies.code);
      const email = await emailCode.take(
        request,
        context,
        "email-change",
        code,
        userId,
      );
      const token = readRequestCookie(request, config.sessionCookie.name);
      await transaction(context.db, async (tx) => {
        if (!token || (await store.lockSession(tx, token)) !== userId) {
          throw new HttpError(401, "unauthorized");
        }
        if (!(await hooks.changeEmail(tx, { userId, email }))) {
          throw new HttpError(409, "email_registered");
        }
        await store.endEmailedRecoveries(tx, userId);
      });
      return authJson(context, { email });
    }),
  };
}
