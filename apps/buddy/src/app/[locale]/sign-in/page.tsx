import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { safeNextPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getPageSession } from "#src/server/auth/get-page-session.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { accountNameOf } from "#src/server/machines/account-name-of.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";
import { SignInPanel } from "#src/sign-in/sign-in-panel.tsx";

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
  const db = getBuddyDb();
  if (!db) return <NotConfigured />;
  const requested = (await searchParams).next;
  const next = typeof requested === "string" ? safeNextPath(requested) : null;
  const session = await getPageSession();
  if (session) {
    const name = await accountNameOf(db, session.userId);
    redirect(getLocalePath(next ?? `/u/${name ?? ""}`, locale));
  }

  return (
    <AuthFrame>
      <SignInPanel next={next} />
    </AuthFrame>
  );
}
