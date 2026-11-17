import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { readMailboxHealth } from "#src/assistant/mailboxes/read-mailbox-health.ts";
import { SettingsMenuPage } from "#src/assistant/settings/settings-menu-page.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/settings");
  const mailboxes = await readMailboxHealth(getUserScope(session));
  return <SettingsMenuPage mailboxNeedsYou={mailboxes.reconnect.length > 0} />;
}
