import { getFinanceModel } from "#src/finance/ai/get-finance-model.ts";
import { bankProvider } from "#src/finance/bank/bank-provider.ts";
import { makeBankSyncHandler } from "#src/finance/bank/make-bank-sync-handler.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";

export const maxDuration = 300;

const handler = makeBankSyncHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getBankClient: bankProvider.getBankClient,
  getModel: getFinanceModel,
  now: () => new Date(),
});

export function GET(request: Request) {
  return handler(request);
}
