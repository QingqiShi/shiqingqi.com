import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { PageHeader } from "@tuja/ui/components/page-header";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CodeForm } from "#src/connect-page/code-form.tsx";
import { ConnectPanel } from "#src/connect-page/connect-panel.tsx";
import { requirePageSession } from "#src/server/auth/require-page-session.ts";
import {
  connectRequestStore,
  normalizeCode,
} from "#src/server/connect/connect-request-store.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Connect a Mac", zh: "连接 Mac" }) };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const locale = validateLocale((await params).locale);
  await connection();
  if (!getBuddyDb()) return <NotConfigured />;
  const raw = (await searchParams).code;
  const typed = typeof raw === "string" ? raw : "";
  await requirePageSession(
    locale,
    typed ? `/connect?code=${encodeURIComponent(typed)}` : "/connect",
  );

  const code = normalizeCode(typed);
  const found = code
    ? await connectRequestStore.findByCode(getBuddyBackend().kv, code)
    : null;
  if (code && found?.request.status === "pending") {
    return (
      <AuthFrame>
        <ConnectPanel code={code} machineName={found.request.name} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <PageHeader
        title={t({ en: "Connect a Mac", zh: "连接 Mac" })}
        description={
          typed
            ? t({
                en: "This code has expired or was used. Start again on your Mac, then type the new code.",
                zh: "此代码已过期或已被使用。请在 Mac 上重新开始，再输入新的代码。",
              })
            : t({
                en: "Type the code that your Mac shows.",
                zh: "输入 Mac 上显示的代码。",
              })
        }
      />
      <CodeForm action={getLocalePath("/connect", locale)} />
    </AuthFrame>
  );
}
