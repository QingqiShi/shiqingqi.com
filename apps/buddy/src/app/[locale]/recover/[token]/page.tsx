import { AuthNotice } from "@tuja/auth-ui/components/auth-notice";
import { RecoveryPanel } from "@tuja/auth-ui/components/recovery-panel";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { lookupRecovery } from "@tuja/server-auth/lookup-recovery";
import type { Metadata } from "next";
import { connection } from "next/server";
import { buddyAuthConfig } from "#src/server/auth/make-buddy-auth.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";
import { nextOf } from "#src/sign-in/signed-in-home.ts";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Get back in", zh: "重新进入" }) };
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
  const db = getBuddyDb();
  if (!db) return <NotConfigured />;
  const recovery = await lookupRecovery(buddyAuthConfig, db, token, new Date());

  return (
    <AuthFrame>
      {recovery ? (
        <RecoveryPanel
          token={token}
          userName={recovery.userName}
          next={nextOf((await searchParams).next)}
        />
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
    </AuthFrame>
  );
}
