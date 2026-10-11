import "server-only";
import { getFinanceModel } from "../ai/get-finance-model.ts";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { limitFinanceRequest } from "../http/limit-finance-request.ts";
import { bankProvider } from "./bank-provider.ts";
import { makeBankHandlers } from "./make-bank-handlers.ts";

export const bankHandlers = makeBankHandlers({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  getBankClient: bankProvider.getBankClient,
  verifyApiKey: bankProvider.verifyApiKey,
  credentialKey: bankProvider.credentialKey,
  getModel: getFinanceModel,
  now: () => new Date(),
  limitRequest: limitFinanceRequest,
});
