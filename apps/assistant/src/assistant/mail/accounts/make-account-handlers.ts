import { eq } from "drizzle-orm";
import { z } from "zod";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import { guardRequest } from "#src/assistant/http/guard-request.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type { MailHandlerDeps } from "#src/assistant/mail/types.ts";
import { checkAccount } from "./check-account.ts";
import { saveAccount } from "./save-account.ts";

const passwordBody = z.object({
  address: z.email().max(320),
  appPassword: z.string().trim().min(1).max(100),
});

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function makeAccountHandlers(deps: MailHandlerDeps) {
  /**
   * Connects a mailbox with an app-specific password. The password is tried
   * on the IMAP server first, and only a login the server accepts is stored.
   */
  function connectWithPassword(provider: "icloud" | "gmail") {
    return async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const mail = deps.getMailDeps();
      if (!mail)
        return assistantJson({ error: "not-configured" }, { status: 503 });
      const body = passwordBody.safeParse(await readJson(request));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const address = body.data.address.toLowerCase();
      const password = body.data.appPassword.replace(/\s+/g, "");
      try {
        const mailbox = await mail.connector(MAIL_SERVERS[provider], {
          user: address,
          pass: password,
        });
        await mailbox.close().catch(() => undefined);
      } catch (error) {
        if (error instanceof MailboxAuthError) {
          return assistantJson({ error: "login-refused" }, { status: 400 });
        }
        return assistantJson(
          { error: "mail-server-unreachable" },
          { status: 502 },
        );
      }
      const db = deps.getDb();
      const { userId } = session;
      const { accountId } = await withUser(db, userId, (scope) =>
        saveAccount(scope, {
          provider,
          address,
          credential: { type: "password", password },
          credentialKey: mail.auth.credentialKey,
          now: deps.now(),
        }),
      );
      deps.runAfter(() => checkAccount(db, userId, accountId, mail));
      return assistantJson({ accountId }, { status: 201 });
    };
  }

  return {
    connectIcloud: connectWithPassword("icloud"),
    /** Gmail without OAuth, for when Google ends the OAuth access of an unverified app. */
    connectGmail: connectWithPassword("gmail"),

    /** Forgets an account with its login, folders and stored mail. The mailbox itself is not touched. */
    remove: async (request: Request, accountId: string): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      if (!z.uuid().safeParse(accountId).success) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      const removed = await withUser(deps.getDb(), session.userId, ({ db }) =>
        db
          .delete(mailAccounts)
          .where(eq(mailAccounts.id, accountId))
          .returning({ id: mailAccounts.id }),
      );
      return removed.length > 0
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },

    /** Logs in to one account now and reads its folders, also for one that waits for a new connect. */
    checkNow: async (
      request: Request,
      accountId: string,
    ): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const mail = deps.getMailDeps();
      if (!mail)
        return assistantJson({ error: "not-configured" }, { status: 503 });
      if (!z.uuid().safeParse(accountId).success) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      const result = await checkAccount(
        deps.getDb(),
        session.userId,
        accountId,
        mail,
      );
      if (!result) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      return assistantJson(result);
    },
  };
}
