import "server-only";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { makeMembersHandler } from "./make-members-handler.ts";

export const membersHandler = makeMembersHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  now: () => new Date(),
});
