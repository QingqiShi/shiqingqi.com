import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { userSettings } from "#src/assistant/db/schema.ts";
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
  const organise = await getAssistantDb()
    .select({
      enabled: userSettings.organiseEnabled,
      notes: userSettings.organiseNotes,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, session.userId))
    .then((rows) => rows.at(0));

  return (
    <SettingsSection level={2} title={t({ en: "Organise", zh: "整理" })}>
      <OrganiseToggle initial={organise?.enabled ?? false} />
      <OrganiseNotesForm initial={organise?.notes ?? ""} />
    </SettingsSection>
  );
}
