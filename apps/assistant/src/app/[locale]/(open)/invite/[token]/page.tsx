import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { connection } from "next/server";
import { lookupInvite } from "#src/assistant/auth/lookup-invite.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { NotConfigured } from "#src/assistant/shell/not-configured.tsx";
import { AuthFrame } from "#src/assistant/sign-in/auth-frame.tsx";
import { AuthNotice } from "#src/assistant/sign-in/auth-notice.tsx";
import { InvitePanel } from "#src/assistant/sign-in/invite-panel.tsx";

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
  if (!isAssistantConfigured()) return <NotConfigured />;
  const invite = await lookupInvite(getAssistantDb(), token, new Date());

  return (
    <AuthFrame>
      {invite ? (
        <InvitePanel
          token={token}
          displayName={invite.displayName}
          recovery={invite.recoveryUserId !== null}
        />
      ) : (
        <AuthNotice
          heading={t({ en: "This invite has ended", zh: "此邀请已失效" })}
          text={t({
            en: "It has expired or was used already. Ask for a new invite, or sign in if you joined before.",
            zh: "邀请已过期或已被使用。请申请新的邀请；如果你已加入，请直接登录。",
          })}
          href={getLocalePath("/sign-in", locale)}
          linkLabel={t({ en: "Go to sign-in", zh: "前往登录" })}
        />
      )}
    </AuthFrame>
  );
}
