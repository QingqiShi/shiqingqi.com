import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { ReactNode } from "react";
import { getPageSession } from "#src/assistant/auth/get-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { readMailboxHealth } from "#src/assistant/mailboxes/read-mailbox-health.ts";
import { SettingsFrame } from "#src/assistant/settings/settings-frame.tsx";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(validateLocale((await params).locale));
  const session = await getPageSession();
  const mailboxes = session
    ? await readMailboxHealth({ db: getAssistantDb(), userId: session.userId })
    : null;
  return (
    <SettingsFrame mailboxNeedsYou={(mailboxes?.reconnect.length ?? 0) > 0}>
      {children}
    </SettingsFrame>
  );
}
