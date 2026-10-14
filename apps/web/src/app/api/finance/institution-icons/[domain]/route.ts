import { getFinanceSession } from "#src/finance/auth/get-finance-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { makeInstitutionIconHandler } from "#src/finance/institutions/make-institution-icon-handler.ts";

const handler = makeInstitutionIconHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
});

export function GET(
  request: Request,
  context: RouteContext<"/api/finance/institution-icons/[domain]">,
) {
  return handler(request, context);
}
