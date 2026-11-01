import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getPageSession } from "#src/assistant/auth/get-page-session.ts";
import { safeNextPath } from "#src/assistant/auth/sign-in-path.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { NotConfigured } from "#src/assistant/shell/not-configured.tsx";
import { AuthFrame } from "#src/assistant/sign-in/auth-frame.tsx";
import { SignInPanel } from "#src/assistant/sign-in/sign-in-panel.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Sign in", zh: "登录" }) };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const locale = validateLocale((await params).locale);
  await connection();
  if (!isAssistantConfigured()) return <NotConfigured />;
  const requested = (await searchParams).next;
  const next = safeNextPath(
    typeof requested === "string" ? requested : undefined,
  );
  if (await getPageSession()) redirect(getLocalePath(next, locale));

  return (
    <AuthFrame>
      <SignInPanel next={next} />
    </AuthFrame>
  );
}
