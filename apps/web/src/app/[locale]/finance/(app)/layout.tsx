import { headers } from "next/headers";
import { connection } from "next/server";
import { safeFinanceNextPath } from "#src/finance/auth/finance-sign-in-path.ts";
import { requireFinancePageSession } from "#src/finance/auth/require-finance-page-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { householdRepository } from "#src/finance/db/repositories/household-repository.ts";
import { memberRepository } from "#src/finance/db/repositories/member-repository.ts";
import { FINANCE_PATH_HEADER } from "#src/finance/http/constants.ts";
import { FinanceProvider } from "#src/finance/replica/finance-provider.tsx";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceShell } from "#src/finance/shell/finance-shell.tsx";
import { validateLocale } from "#src/i18n/validate-locale.ts";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;

  const session = await requireFinancePageSession(
    locale,
    safeFinanceNextPath((await headers()).get(FINANCE_PATH_HEADER)),
  );
  const scope = { db: getFinanceDb(), householdId: session.householdId };
  const [household, member] = await Promise.all([
    householdRepository.find(scope),
    memberRepository.findById(scope, session.memberId),
  ]);

  return (
    <FinanceProvider
      householdId={session.householdId}
      memberId={session.memberId}
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
