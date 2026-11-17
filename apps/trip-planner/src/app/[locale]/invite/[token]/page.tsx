import { AuthNotice } from "@tuja/auth-ui/components/auth-notice";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { setLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getAuthSecret } from "#src/auth/get-auth-secret.ts";
import { isInviteOpen } from "#src/share/get-sharing.ts";
import { JoinTrip } from "#src/share/join-trip.tsx";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";
import { getViewerId } from "#src/trips/get-trips.ts";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  setLocale(validateLocale((await props.params).locale));
  return { title: t({ en: "Join a trip", zh: "加入行程" }) };
}

/**
 * Where an invite link leads. It names no trip, because the visitor is not a
 * member yet: a visitor signs in or signs up, comes back here, and joins.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: rawLocale, token } = await params;
  const locale = validateLocale(rawLocale);
  setLocale(locale);
  await connection();
  if (!getAuthSecret()) return <NotConfigured />;
  const isOpen = await isInviteOpen(token);
  const isSignedIn = isOpen && (await getViewerId()) !== null;

  return (
    <AuthFrame>
      {isOpen ? (
        <div css={stack.item}>
          <PageHeader
            title={t({ en: "Join a trip", zh: "加入行程" })}
            description={
              isSignedIn
                ? t({
                    en: "You are invited to a trip. Join to see it with your trips.",
                    zh: "你受邀加入一个行程。加入后，它会出现在你的行程里。",
                  })
                : t({
                    en: "You are invited to a trip. Sign in or sign up first. This page then lets you join.",
                    zh: "你受邀加入一个行程。请先登录或注册，之后即可在此页加入。",
                  })
            }
          />
          {isSignedIn ? (
            <JoinTrip token={token} />
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
            en: "It was used already, or it is past its time. Ask the person who sent it for a new one.",
            zh: "邀请已被使用或已过期。请向发给你邀请的人要一个新的。",
          })}
          href={getLocalePath("/", locale)}
          linkLabel={t({ en: "Go to Trips", zh: "前往旅行计划" })}
        />
      )}
    </AuthFrame>
  );
}
