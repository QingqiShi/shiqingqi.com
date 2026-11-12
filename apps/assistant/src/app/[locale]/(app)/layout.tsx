import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { safeNextPath } from "@tuja/server-auth/sign-in-path";
import { SIDEBAR_COLLAPSED_COOKIE } from "@tuja/ui/components/sidebar-collapsed-cookie";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { ASSISTANT_PATH_HEADER } from "#src/assistant/http/constants.ts";
import { readMailboxHealth } from "#src/assistant/mailboxes/read-mailbox-health.ts";
import { AppFrame } from "#src/assistant/shell/app-frame.tsx";
import { DateLocaleProvider } from "#src/assistant/shell/date-locale-provider.tsx";
import { getRegionalEnglish } from "#src/assistant/shell/get-date-locale.ts";
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
  const session = await requirePageSession(
    locale,
    safeNextPath((await headers()).get(ASSISTANT_PATH_HEADER)),
  );
  const scope = { db: getAssistantDb(), userId: session.userId };
  const mailboxes = await readMailboxHealth(scope);
  return (
    <DateLocaleProvider regionalEnglish={await getRegionalEnglish()}>
      <AppFrame
        mailboxNeedsYou={mailboxes.reconnect.length > 0}
        defaultCollapsed={
          (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1"
        }
      >
        {children}
      </AppFrame>
    </DateLocaleProvider>
  );
}
