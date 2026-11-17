import { SignUpPanel } from "@tuja/auth-ui/components/sign-up-panel";
import { t } from "@tuja/i18n";
import { setLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getAuthSecret } from "#src/auth/get-auth-secret.ts";
import { lookupPageSignUp } from "#src/auth/lookup-page-sign-up.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { LinkEnded } from "#src/sign-in/link-ended.tsx";
import { nextOf } from "#src/sign-in/next-of.ts";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";

export async function generateMetadata(props: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  setLocale(validateLocale((await props.params).locale));
  return { title: t({ en: "Sign up", zh: "注册" }) };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale, token } = await params;
  setLocale(validateLocale(locale));
  await connection();
  if (!getAuthSecret()) return <NotConfigured />;
  const signUp = await lookupPageSignUp(token);

  return (
    <AuthFrame>
      {signUp ? (
        <SignUpPanel
          token={token}
          email={signUp.email}
          next={nextOf((await searchParams).next)}
        />
      ) : (
        <LinkEnded />
      )}
    </AuthFrame>
  );
}
