import "server-only";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { limitFinanceRequest } from "../http/limit-finance-request.ts";
import { isAllowedFinanceOrigin } from "./is-allowed-finance-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";

export const authHandlers = makeAuthHandlers({
  getDb: () => (isFinanceConfigured() ? getFinanceDb() : null),
  now: () => new Date(),
  authSecret: () => process.env.FINANCE_AUTH_SECRET,
  setupSecret: () => process.env.FINANCE_SETUP_SECRET,
  limitRequest: limitFinanceRequest,
  isAllowedOrigin: isAllowedFinanceOrigin,
});
