import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import type { ReportBuildDeps } from "./build-morning-report.ts";
import { claimReportPreview } from "./claim-report-preview.ts";
import { runReportPreview } from "./run-report-preview.ts";

export function makeReportPreviewHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
    /** Null when no mailbox can be read: then the preview ends as failed. */
    getBuildDeps: () => ReportBuildDeps | null;
    /** Runs the work once the response is sent. */
    runInBackground: (work: () => Promise<void>) => void;
  },
) {
  return {
    /** Starts a preview of the next morning report; a 409 while one runs. */
    start: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const scope = { db: deps.getDb(), userId: session.userId };
      const claim = await claimReportPreview(scope, deps.now());
      if (!claim) {
        return assistantJson({ error: "preview-running" }, { status: 409 });
      }
      deps.runInBackground(() =>
        runReportPreview(scope, claim, deps.getBuildDeps()),
      );
      return assistantNoContent();
    },
  };
}
