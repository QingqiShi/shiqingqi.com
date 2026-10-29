import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeFinanceNextPath } from "#src/finance/auth/finance-sign-in-path.ts";
import { getFinancePageSession } from "#src/finance/auth/get-finance-page-session.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { SignInPanel } from "#src/finance/sign-in/sign-in-panel.tsx";

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

  return (
    <FinanceAuthFrame>
      <SignInPanel next={next} />
    </FinanceAuthFrame>
  );
}
