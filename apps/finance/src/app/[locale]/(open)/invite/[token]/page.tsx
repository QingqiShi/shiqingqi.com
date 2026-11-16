import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  getFinancePageSession,
  getNewUserPageSession,
} from "#src/finance/auth/get-finance-page-session.ts";
import { lookupInvite } from "#src/finance/auth/lookup-invite.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { AuthNotice } from "#src/finance/sign-in/auth-notice.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { InvitePanel } from "#src/finance/sign-in/invite-panel.tsx";
import { Anchor } from "#src/links/anchor.tsx";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Join", zh: "加入" }) };
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
  const invite = await lookupInvite(getFinanceDb(), token, new Date());
  const session = invite ? await getFinancePageSession() : null;
  // The demo's visitor has no account yet, so they sign in or sign up first.
  const member = session && !session.readOnly ? session : null;
  const newUser = invite && !member ? await getNewUserPageSession() : null;
  const invitedFor = t({ en: "This invite is for", zh: "此邀请的受邀成员：" });

  return (
    <FinanceAuthFrame>
      {invite ? (
        <div css={stack.item}>
          <div css={stack.tight}>
            <Heading level={1} look="h1">
              {`${t({ en: "Join", zh: "加入" })} ${invite.householdName}`}
            </Heading>
            <Text tone="muted">
              {`${invitedFor}${locale === "zh" ? "" : " "}${invite.memberName}${locale === "zh" ? "。" : ". "}${
                member
                  ? t({
                      en: "You belong to a household already. An account can be in one household.",
                      zh: "你已属于一个家庭。一个账号只能加入一个家庭。",
                    })
                  : newUser
                    ? t({
                        en: "Join to see the household's accounts and add your own.",
                        zh: "加入后即可查看家庭账户，并添加你自己的账户。",
                      })
                    : t({
                        en: "Sign in or sign up first. This page then lets you join.",
                        zh: "请先登录或注册，之后即可在此页加入。",
                      })
              }`}
            </Text>
          </div>
          {member ? (
            <Anchor href={getLocalePath("/", locale)}>
              {t({ en: "Go to your household", zh: "前往你的家庭" })}
            </Anchor>
          ) : newUser ? (
            <InvitePanel token={token} />
          ) : (
            <Button
              look="primary"
              size="lg"
              href={signInPath(locale, `/invite/${token}`)}
              css={fill.inline}
            >
              {t({ en: "Sign in or sign up", zh: "登录或注册" })}
            </Button>
          )}
        </div>
      ) : (
        <AuthNotice
          heading={t({ en: "This invite has ended", zh: "此邀请已失效" })}
          text={t({
            en: "It has expired or was used already. Ask for a new invite, or sign in if you joined before.",
            zh: "邀请已过期或已被使用。请让家人重新发送邀请；如果你已加入，请直接登录。",
          })}
          href={getLocalePath("/sign-in", locale)}
          linkLabel={t({ en: "Go to sign-in", zh: "前往登录" })}
        />
      )}
    </FinanceAuthFrame>
  );
}
