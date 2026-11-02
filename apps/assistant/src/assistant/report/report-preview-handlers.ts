import { after } from "next/server";
import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getReportBuildDeps } from "./get-report-build-deps.ts";
import { makeReportPreviewHandlers } from "./make-report-preview-handlers.ts";

export const reportPreviewHandlers = makeReportPreviewHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  now: () => new Date(),
  getBuildDeps: getReportBuildDeps,
  runInBackground: after,
});
