import { z } from "zod";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import { guardRequest } from "#src/assistant/http/guard-request.ts";
import type { MailHandlerDeps } from "#src/assistant/mail/types.ts";
import {
  CATEGORY_NAME_MAX,
  CategoryMappingError,
  saveCategoryMapping,
} from "./save-category-mapping.ts";

const body = z.object({
  folders: z
    .array(
      z.object({
        folderId: z.uuid(),
        category: z
          .string()
          .max(CATEGORY_NAME_MAX * 2)
          .nullable(),
      }),
    )
    .max(2000),
});

export function makeCategoryHandlers(
  deps: Pick<MailHandlerDeps, "isConfigured" | "getDb" | "getSession">,
) {
  return {
    save: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const parsed = body.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      try {
        await withUser(deps.getDb(), session.userId, (scope) =>
          saveCategoryMapping(scope, parsed.data.folders),
        );
      } catch (error) {
        if (error instanceof CategoryMappingError) {
          return assistantJson(
            { error: error.code, detail: error.detail },
            { status: 400 },
          );
        }
        throw error;
      }
      return assistantNoContent();
    },
  };
}
