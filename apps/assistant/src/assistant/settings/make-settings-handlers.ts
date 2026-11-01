import { sql } from "drizzle-orm";
import { z } from "zod";
import { USER_LOCALES, userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { isTimeZone } from "#src/assistant/digest/due-digest-date.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { isPushServiceEndpoint } from "#src/assistant/push/is-push-service-endpoint.ts";
import { pushDevices } from "#src/assistant/push/push-devices.ts";

const settingsBody = z.object({
  timeZone: z.string().max(64).refine(isTimeZone),
  digestHour: z.int().min(0).max(23),
  locale: z.enum(USER_LOCALES),
});

const mailboxWritesBody = z.object({ enabled: z.boolean() });

const PUSH_ENDPOINT = z.string().max(2048).refine(isPushServiceEndpoint);

const subscribeBody = z.object({
  endpoint: PUSH_ENDPOINT,
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(64),
  }),
});

const unsubscribeBody = z.object({ endpoint: PUSH_ENDPOINT });

export function makeSettingsHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /** Saves the time zone, the digest hour and the digest language. */
    save: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = settingsBody.safeParse(
        await request.json().catch(() => null),
      );
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const values = { ...body.data, updatedAt: deps.now() };
      await withUser(deps.getDb(), session.userId, ({ db, userId }) =>
        db
          .insert(userSettings)
          .values({ userId, ...values })
          .onConflictDoUpdate({ target: userSettings.userId, set: values }),
      );
      return assistantNoContent();
    },

    /**
     * Allows or stops the mailbox writes. Turning them on starts a new
     * period: mail classified before it is left as it is.
     */
    saveMailboxWrites: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = mailboxWritesBody.safeParse(
        await request.json().catch(() => null),
      );
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const { enabled } = body.data;
      const now = deps.now();
      await withUser(deps.getDb(), session.userId, ({ db, userId }) =>
        db
          .insert(userSettings)
          .values({
            userId,
            mailboxWrites: enabled,
            mailboxWritesSince: enabled ? now : null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: {
              mailboxWrites: enabled,
              mailboxWritesSince: enabled
                ? sql`case when ${userSettings.mailboxWrites} then ${userSettings.mailboxWritesSince} else ${now.toISOString()}::timestamptz end`
                : null,
              updatedAt: now,
            },
          }),
      );
      return assistantNoContent();
    },

    /** Saves this device for the digest notification. */
    subscribe: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = subscribeBody.safeParse(
        await request.json().catch(() => null),
      );
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const userAgent = (request.headers.get("User-Agent") ?? "").slice(0, 300);
      await withUser(deps.getDb(), session.userId, (scope) =>
        pushDevices.save(scope, body.data, userAgent),
      );
      return assistantNoContent();
    },

    unsubscribe: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = unsubscribeBody.safeParse(
        await request.json().catch(() => null),
      );
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      await withUser(deps.getDb(), session.userId, (scope) =>
        pushDevices.remove(scope, [body.data.endpoint]),
      );
      return assistantNoContent();
    },
  };
}
