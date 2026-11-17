import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { userSettings } from "#src/assistant/db/schema.ts";
import { ConnectMailboxFirst } from "#src/assistant/mailboxes/connect-mailbox-first.tsx";
import { readMailboxHealth } from "#src/assistant/mailboxes/read-mailbox-health.ts";
import { OrganiseNotesForm } from "#src/assistant/settings/organise-notes-form.tsx";
import { OrganiseToggle } from "#src/assistant/settings/organise-toggle.tsx";
import { SettingsSection } from "#src/assistant/settings/settings-section.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Organise", zh: "整理" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/settings/organise");
  const scope = getUserScope(session);
  const [organise, mailboxes] = await Promise.all([
    scope.db
      .select({
        enabled: userSettings.organiseEnabled,
        notes: userSettings.organiseNotes,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, session.userId))
      .then((rows) => rows.at(0)),
    readMailboxHealth(scope),
  ]);

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Organise", zh: "整理" })}
      description={t({
        en: "The assistant files your mail into folders, so your inbox stays clear.",
        zh: "助手替你把邮件归入文件夹，让收件箱保持清爽。",
      })}
    >
      {mailboxes.connected === 0 ? (
        <ConnectMailboxFirst
          why={t({
            en: "Organise files the mail of your mailboxes, and none is connected yet.",
            zh: "“整理”处理的是你已连接邮箱里的邮件，而现在还没有连接任何邮箱。",
          })}
        />
      ) : (
        <OrganiseToggle initial={organise?.enabled ?? false} />
      )}
      <OrganiseNotesForm initial={organise?.notes ?? ""} />
    </SettingsSection>
  );
}
