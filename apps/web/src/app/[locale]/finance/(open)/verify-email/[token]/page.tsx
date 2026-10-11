import type { Metadata } from "next";
import { connection } from "next/server";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { VerifyEmailPanel } from "#src/finance/sign-in/verify-email-panel.tsx";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Recovery email", zh: "恢复邮箱" }) };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;

  return (
    <FinanceAuthFrame>
      <VerifyEmailPanel token={token} />
    </FinanceAuthFrame>
  );
}
