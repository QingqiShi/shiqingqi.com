import "server-only";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { makeHouseholdHandler } from "./make-household-handler.ts";

export const householdHandler = makeHouseholdHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  now: () => new Date(),
});
