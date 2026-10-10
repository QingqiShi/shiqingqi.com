import "server-only";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { limitFinanceRequest } from "../http/limit-finance-request.ts";
import { loadReportFonts } from "./load-report-fonts.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";

export const reportHandlers = makeReportHandlers({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  loadFonts: loadReportFonts,
  now: () => new Date(),
  limitRequest: limitFinanceRequest,
});
