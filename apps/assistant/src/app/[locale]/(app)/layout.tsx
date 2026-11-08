import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { headers } from "next/headers";
import { connection } from "next/server";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { safeNextPath } from "#src/assistant/auth/sign-in-path.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { ASSISTANT_PATH_HEADER } from "#src/assistant/http/constants.ts";
import { AppFrame } from "#src/assistant/shell/app-frame.tsx";
import { NotConfigured } from "#src/assistant/shell/not-configured.tsx";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(locale);
  await connection();
  if (!isAssistantConfigured()) return <NotConfigured />;
  await requirePageSession(
    locale,
    safeNextPath((await headers()).get(ASSISTANT_PATH_HEADER)),
  );
  return <AppFrame>{children}</AppFrame>;
}
