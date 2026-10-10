import { getFinanceModel } from "#src/finance/ai/get-finance-model.ts";
import { getBankClient } from "#src/finance/bank/get-bank-client.ts";
import { makeBankSyncHandler } from "#src/finance/bank/make-bank-sync-handler.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";

export const maxDuration = 300;

const handler = makeBankSyncHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getBankClient,
  getModel: getFinanceModel,
  now: () => new Date(),
});

export function GET(request: Request) {
  return handler(request);
}
