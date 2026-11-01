import { z } from "zod";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import type { AssistantSession } from "#src/assistant/auth/types.ts";
import { senderRules } from "#src/assistant/classify/sender-rules.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import { guardRequest } from "#src/assistant/http/guard-request.ts";
import {
  closeItems,
  correctItems,
  type ItemsClosedHandler,
} from "./correct-items.ts";

export interface DigestHandlerDeps {
  isConfigured: () => boolean;
  getDb: () => AssistantDb;
  getSession: (request: Request) => Promise<AssistantSession | null>;
  /** The model that drafts sender rules; null without an API key. */
  getEditorModel: () => AssistantModel | null;
  onItemsClosed: ItemsClosedHandler;
  now: () => Date;
  runAfter: (task: () => Promise<unknown>) => void;
}

const itemsBody = z.object({
  action: z.enum(["done", "not-important", "should-show"]),
  /** The classification ids of one item: one thread. */
  ids: z.array(z.uuid()).min(1).max(50),
});

export function makeDigestHandlers(deps: DigestHandlerDeps) {
  function afterClose(
    userId: string,
    messageIds: string[],
    reason: "done" | "not_important",
  ) {
    if (messageIds.length === 0) return;
    const db = deps.getDb();
    deps.runAfter(() => deps.onItemsClosed({ db, userId, messageIds, reason }));
  }

  return {
    /** 已处理, 不重要 or "should show" on one digest item. */
    items: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = itemsBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const { userId } = session;
      const db = deps.getDb();
      if (body.data.action === "done") {
        const closed = await withUser(db, userId, (scope) =>
          closeItems(scope, body.data.ids, deps.now()),
        );
        afterClose(userId, closed, "done");
        return assistantJson({ closed: closed.length });
      }
      const result = await correctItems(
        { db, userId },
        {
          classificationIds: body.data.ids,
          kind:
            body.data.action === "not-important"
              ? "not_important"
              : "should_show",
          now: deps.now(),
        },
        deps.getEditorModel(),
      );
      if (result.messageIds.length === 0) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      afterClose(userId, result.closedMessageIds, "not_important");
      return assistantJson({ rule: result.rule });
    },

    /** Turns a drafted sender rule into one that classification applies. */
    confirmRule: async (request: Request, ruleId: string) => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      if (!z.uuid().safeParse(ruleId).success) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      const confirmed = await withUser(deps.getDb(), session.userId, (scope) =>
        senderRules.confirm(scope, ruleId, deps.now()),
      );
      return confirmed
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },

    /** Deletes a drafted rule the user does not want. */
    dismissRule: async (request: Request, ruleId: string) => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      if (!z.uuid().safeParse(ruleId).success) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      const dismissed = await withUser(deps.getDb(), session.userId, (scope) =>
        senderRules.dismiss(scope, ruleId),
      );
      return dismissed
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },
  };
}
