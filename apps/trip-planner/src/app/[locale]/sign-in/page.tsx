import { SignInPanel } from "@tuja/auth-ui/components/sign-in-panel";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { setLocale } from "@tuja/i18n/server-locale";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthSecret } from "#src/auth/get-auth-secret.ts";
import { getPageSession } from "#src/auth/get-page-session.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";
import { nextOf } from "#src/sign-in/signed-in-home.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  setLocale(validateLocale((await props.params).locale));
  return { title: t({ en: "Sign in", zh: "登录" }) };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const locale = validateLocale((await params).locale);
  setLocale(locale);
  await connection();
  if (!getAuthSecret()) return <NotConfigured />;
  const next = nextOf((await searchParams).next);
  if (await getPageSession()) redirect(getLocalePath(next, locale));

  return (
    <AuthFrame>
      <SignInPanel next={next} />
    </AuthFrame>
  );
}
