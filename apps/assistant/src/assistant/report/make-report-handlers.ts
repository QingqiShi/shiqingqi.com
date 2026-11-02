import { z } from "zod";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { markReportSeen } from "./read-report.ts";

export function makeReportHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /** Marks a report of the signed-in user seen. */
    markSeen: async (request: Request, reportId: string): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const found =
        z.uuid().safeParse(reportId).success &&
        (await markReportSeen(
          { db: deps.getDb(), userId: session.userId },
          reportId,
          deps.now(),
        ));
      return found
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },
  };
}
