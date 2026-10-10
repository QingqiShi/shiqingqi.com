import { getFinanceSession } from "#src/finance/auth/get-finance-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { makeSyncHandlers } from "#src/finance/sync/make-sync-handlers.ts";

const handlers = makeSyncHandlers({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  now: () => new Date(),
});

export function GET(request: Request) {
  return handlers.GET(request);
}

export function POST(request: Request) {
  return handlers.POST(request);
}
