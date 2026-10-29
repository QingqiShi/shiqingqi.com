import { headers } from "next/headers";
import { connection } from "next/server";
import { safeFinanceNextPath } from "#src/finance/auth/finance-sign-in-path.ts";
import { requireFinancePageSession } from "#src/finance/auth/require-finance-page-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { householdRepository } from "#src/finance/db/repositories/household-repository.ts";
import { memberRepository } from "#src/finance/db/repositories/member-repository.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import { FINANCE_PATH_HEADER } from "#src/finance/http/constants.ts";
import { FinanceProvider } from "#src/finance/replica/finance-provider.tsx";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceShell } from "#src/finance/shell/finance-shell.tsx";
import { setLocale } from "#src/i18n/server-locale.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(locale);
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;

  const session = await requireFinancePageSession(
    locale,
    safeFinanceNextPath((await headers()).get(FINANCE_PATH_HEADER)),
  );
  const { household, member } = await withHousehold(
    getFinanceDb(),
    session.householdId,
    async (scope) => ({
      household: await householdRepository.find(scope),
      member: await memberRepository.findById(scope, session.memberId),
    }),
  );

  return (
    <FinanceProvider
      householdId={session.householdId}
      memberId={session.memberId}
      readOnly={session.readOnly}
    >
      <FinanceShell
        locale={locale}
        memberName={member?.name ?? ""}
        householdName={household?.name ?? ""}
      >
        {children}
      </FinanceShell>
    </FinanceProvider>
  );
}
