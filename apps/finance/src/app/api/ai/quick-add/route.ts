import { getFinanceModel } from "#src/finance/ai/get-finance-model.ts";
import { makeQuickAddHandler } from "#src/finance/ai/make-quick-add-handler.ts";
import { getFinanceSession } from "#src/finance/auth/get-finance-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { limitFinanceRequest } from "#src/finance/http/limit-finance-request.ts";

export const POST = makeQuickAddHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  getModel: getFinanceModel,
  limitRequest: limitFinanceRequest,
  onModelError: (error) => {
    console.error("Finance quick add failed", error);
  },
});
