import { AuthNotice } from "@tuja/auth-ui/components/auth-notice";
import { SignUpPanel } from "@tuja/auth-ui/components/sign-up-panel";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { safeNextPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { connection } from "next/server";
import { financeAuthStore } from "#src/finance/auth/finance-auth-store.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Sign up for Finance", zh: "注册家庭账本" }) };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale: rawLocale, token } = await params;
  const locale = validateLocale(rawLocale);
  await connection();
  const requested = (await searchParams).next;
  const next = safeNextPath(
    typeof requested === "string" ? requested : undefined,
  );
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;
  const signUp = await asFinanceApp(getFinanceDb(), (tx) =>
    financeAuthStore.lookupSignUp(tx, token, new Date()),
  );

  return (
    <FinanceAuthFrame>
      {signUp ? (
        <SignUpPanel token={token} email={signUp.email} next={next} />
      ) : (
        <AuthNotice
          heading={t({ en: "This link has ended", zh: "此链接已失效" })}
          text={t({
            en: "It has expired or was used already. Ask for a new code on the sign-in page.",
            zh: "链接已过期或已被使用。请在登录页重新获取验证码。",
          })}
          href={getLocalePath("/sign-in", locale)}
          linkLabel={t({ en: "Go to sign-in", zh: "前往登录" })}
        />
      )}
    </FinanceAuthFrame>
  );
}
