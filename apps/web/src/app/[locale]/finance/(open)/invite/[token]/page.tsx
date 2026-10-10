import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import { lookupInvite } from "#src/finance/auth/lookup-invite.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { InvitePanel } from "#src/finance/sign-in/invite-panel.tsx";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
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

  return (
    <FinanceAuthFrame>
      {invite ? (
        <InvitePanel
          token={token}
          householdName={invite.householdName}
          memberName={invite.memberName}
          recovery={invite.recoveryUserId !== null}
        />
      ) : (
        <div css={stack.tight}>
          <Heading level={1} look="h2">
            {t({ en: "This invite has ended", zh: "此邀请已失效" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "It has expired or was used already. Ask for a new invite, or sign in if you joined before.",
              zh: "邀请已过期或已被使用。请让家人重新发送邀请；如果你已加入，请直接登录。",
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
