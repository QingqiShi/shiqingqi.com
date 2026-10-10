import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeFinanceNextPath } from "#src/finance/auth/finance-sign-in-path.ts";
import { getFinancePageSession } from "#src/finance/auth/get-finance-page-session.ts";
import { getSetupState } from "#src/finance/auth/get-setup-state.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import {
  SignInPanel,
  type SignInSetup,
} from "#src/finance/sign-in/sign-in-panel.tsx";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Sign in", zh: "登录" }) };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const locale = validateLocale((await params).locale);
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;
  const requested = (await searchParams).next;
  const next = safeFinanceNextPath(
    typeof requested === "string" ? requested : undefined,
  );
  if (await getFinancePageSession()) redirect(getLocalePath(next, locale));

  const state = await getSetupState(getFinanceDb());
  const setup: SignInSetup =
    state.mode === "claim"
      ? {
          mode: "claim",
          householdName: state.householdName,
          memberName: state.memberName,
        }
      : { mode: state.mode };

  return (
    <FinanceAuthFrame>
      <SignInPanel next={next} setup={setup} />
    </FinanceAuthFrame>
  );
}
