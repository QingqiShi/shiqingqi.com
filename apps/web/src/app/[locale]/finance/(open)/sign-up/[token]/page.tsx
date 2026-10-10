import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import { lookupSignUp } from "#src/finance/auth/start-sign-up.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { SignUpPanel } from "#src/finance/sign-in/sign-up-panel.tsx";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { Anchor } from "#src/links/anchor.tsx";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Sign up for Finance", zh: "注册家庭账本" }) };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: rawLocale, token } = await params;
  const locale = validateLocale(rawLocale);
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;
  const signUp = await lookupSignUp(getFinanceDb(), token, new Date());

  return (
    <FinanceAuthFrame>
      {signUp ? (
        <SignUpPanel token={token} email={signUp.email} />
      ) : (
        <div css={stack.tight}>
          <Heading level={1} look="h2">
            {t({ en: "This link has ended", zh: "此链接已失效" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "It has expired or was used already. Ask for a new code on the sign-in page.",
              zh: "链接已过期或已被使用。请在登录页重新获取验证码。",
            })}
          </Text>
          <Anchor href={getLocalePath("/finance/sign-in", locale)}>
            {t({ en: "Go to sign-in", zh: "前往登录" })}
          </Anchor>
        </div>
      )}
    </FinanceAuthFrame>
  );
}
