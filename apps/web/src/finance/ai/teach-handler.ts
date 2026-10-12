import "server-only";
import { getFinanceSession } from "../auth/get-finance-session.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { limitFinanceRequest } from "../http/limit-finance-request.ts";
import { getFinanceModel } from "./get-finance-model.ts";
import { makeTeachHandler } from "./make-teach-handler.ts";

export const teachHandler = makeTeachHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  getModel: getFinanceModel,
  limitRequest: limitFinanceRequest,
  onModelError: (error) => {
    console.error("Finance teach failed", error);
  },
});
