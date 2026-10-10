import "server-only";
import { getFinanceModel } from "../ai/get-finance-model.ts";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { limitFinanceRequest } from "../http/limit-finance-request.ts";
import { getBankClient } from "./get-bank-client.ts";
import { makeBankHandlers } from "./make-bank-handlers.ts";

export const bankHandlers = makeBankHandlers({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  getBankClient,
  getModel: getFinanceModel,
  now: () => new Date(),
  limitRequest: limitFinanceRequest,
});
