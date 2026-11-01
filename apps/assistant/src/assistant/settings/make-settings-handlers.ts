import { z } from "zod";
import { USER_LOCALES, userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { ORGANISE_NOTES_MAX_CHARS } from "#src/assistant/organise/organise-notes-max-chars.ts";
import { isPushServiceEndpoint } from "#src/assistant/push/is-push-service-endpoint.ts";
import { pushDevices } from "#src/assistant/push/push-devices.ts";
import { isTimeZone } from "#src/assistant/report/due-report-date.ts";

const settingsBody = z.object({
  timeZone: z.string().max(64).refine(isTimeZone),
  digestHour: z.int().min(0).max(23),
  locale: z.enum(USER_LOCALES),
});

const switchBody = z.object({ enabled: z.boolean() });

const notesBody = z.object({
  notes: z.string().trim().max(ORGANISE_NOTES_MAX_CHARS),
});

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
  async function saveSettings(
    userId: string,
    change: Partial<typeof userSettings.$inferInsert>,
  ) {
    const values = { ...change, updatedAt: deps.now() };
    await withUser(deps.getDb(), userId, ({ db, userId }) =>
      db
        .insert(userSettings)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: userSettings.userId, set: values }),
    );
  }

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
      await saveSettings(session.userId, body.data);
      return assistantNoContent();
    },

    /** Turns organising on or off: while it is on, a cron files every inbox mail into a folder. */
    saveOrganise: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = switchBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      await saveSettings(session.userId, {
        organiseEnabled: body.data.enabled,
      });
      return assistantNoContent();
    },

    /** Saves the user's notes on where mail goes, which the organise model reads. */
    saveOrganiseNotes: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = notesBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      await saveSettings(session.userId, { organiseNotes: body.data.notes });
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
