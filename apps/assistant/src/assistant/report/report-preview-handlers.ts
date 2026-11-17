import { after } from "next/server";
import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getReportBuildDeps } from "./get-report-build-deps.ts";
import { makeReportPreviewHandlers } from "./make-report-preview-handlers.ts";

export const reportPreviewHandlers = makeReportPreviewHandlers({
  isConfigured: isAssistantConfigured,
  userScope: getUserScope,
  getSession: getAssistantSession,
  now: () => new Date(),
  getBuildDeps: getReportBuildDeps,
  runInBackground: after,
});
