import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { userSettings } from "#src/assistant/db/schema.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { OrganiseNotesForm } from "#src/assistant/settings/organise-notes-form.tsx";
import { OrganiseToggle } from "#src/assistant/settings/organise-toggle.tsx";
import { PushToggle } from "#src/assistant/settings/push-toggle.tsx";
import { SettingsForm } from "#src/assistant/settings/settings-form.tsx";
import { SignOutButton } from "#src/assistant/shell/sign-out-button.tsx";
import { AnchorButton } from "#src/links/anchor-button.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/settings");
  const db = getAssistantDb();
  const [settings, organise] = await Promise.all([
    readReportSettings({ db, userId: session.userId }),
    db
      .select({
        enabled: userSettings.organiseEnabled,
        notes: userSettings.organiseNotes,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, session.userId))
      .then((rows) => rows.at(0)),
  ]);
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(settings.timeZone)) timeZones.push(settings.timeZone);

  return (
    <div css={stack.section}>
      <Heading level={1} look="h1">
        {t({ en: "Settings", zh: "设置" })}
      </Heading>
      <Section
        level={2}
        divider
        title={t({ en: "Morning report", zh: "晨报" })}
      >
        <SettingsForm initial={settings} timeZones={timeZones} />
      </Section>
      <Section level={2} divider title={t({ en: "Notifications", zh: "通知" })}>
        <PushToggle
          publicKey={process.env.NEXT_PUBLIC_ASSISTANT_VAPID_PUBLIC_KEY ?? null}
        />
      </Section>
      <Section level={2} divider title={t({ en: "Organise", zh: "整理" })}>
        <OrganiseToggle initial={organise?.enabled ?? false} />
        <OrganiseNotesForm initial={organise?.notes ?? ""} />
      </Section>
      <Section level={2} divider title={t({ en: "Mail", zh: "邮件" })}>
        <div css={cluster.tight}>
          <AnchorButton
            href={getLocalePath("/accounts", locale)}
            look="outline"
          >
            {t({ en: "Mailboxes", zh: "邮箱" })}
          </AnchorButton>
        </div>
      </Section>
      <Section level={2} divider title={t({ en: "Account", zh: "账户" })}>
        <div>
          <SignOutButton />
        </div>
      </Section>
    </div>
  );
}
