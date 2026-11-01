import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { readCalendarAccount } from "#src/assistant/calendar/write-calendar-events.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { userSettings } from "#src/assistant/db/schema.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { readDigestSettings } from "#src/assistant/digest/build-digest.ts";
import { CalendarToggle } from "#src/assistant/settings/calendar-toggle.tsx";
import { MailboxWritesToggle } from "#src/assistant/settings/mailbox-writes-toggle.tsx";
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
  const { settings, switches } = await withUser(
    db,
    session.userId,
    async (scope) => ({
      settings: await readDigestSettings(scope),
      switches: (
        await scope.db
          .select({
            mailboxWrites: userSettings.mailboxWrites,
            calendarEvents: userSettings.calendarEvents,
          })
          .from(userSettings)
      ).at(0),
    }),
  );
  const calendarAccount = await readCalendarAccount(db, session.userId);
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
        title={t({ en: "Morning digest", zh: "每日摘要" })}
      >
        <SettingsForm initial={settings} timeZones={timeZones} />
      </Section>
      <Section level={2} divider title={t({ en: "Notifications", zh: "通知" })}>
        <PushToggle
          publicKey={process.env.NEXT_PUBLIC_ASSISTANT_VAPID_PUBLIC_KEY ?? null}
        />
      </Section>
      <Section level={2} divider title={t({ en: "Mail", zh: "邮件" })}>
        <MailboxWritesToggle initial={switches?.mailboxWrites ?? false} />
        <div css={cluster.tight}>
          <AnchorButton
            href={getLocalePath("/accounts", locale)}
            look="outline"
          >
            {t({ en: "Mailboxes", zh: "邮箱" })}
          </AnchorButton>
          <AnchorButton
            href={getLocalePath("/categories", locale)}
            look="outline"
          >
            {t({ en: "Categories", zh: "分类" })}
          </AnchorButton>
          <AnchorButton href={getLocalePath("/history", locale)} look="outline">
            {t({ en: "Old mail", zh: "旧邮件" })}
          </AnchorButton>
        </div>
      </Section>
      <Section level={2} divider title={t({ en: "Calendar", zh: "日历" })}>
        {calendarAccount ? (
          <CalendarToggle
            initial={switches?.calendarEvents ?? true}
            address={calendarAccount.address}
          />
        ) : (
          <div css={stack.tight}>
            <Text as="p" tone="muted">
              {t({
                en: "The assistant can put appointments, trips and deadlines from your mail into iCloud Calendar, with alarms. It uses the app-specific password of an iCloud mailbox, so connect one first; the calendar events then start on their own.",
                zh: "助手可以把邮件里的预约、行程和截止日期写入 iCloud 日历，并设置提醒。它使用 iCloud 邮箱的 App 专用密码，所以请先连接一个 iCloud 邮箱，之后会自动开始写入日历。",
              })}
            </Text>
            <div>
              <AnchorButton
                href={getLocalePath("/accounts", locale)}
                look="outline"
              >
                {t({ en: "Connect iCloud Mail", zh: "连接 iCloud 邮件" })}
              </AnchorButton>
            </div>
          </div>
        )}
      </Section>
      <Section level={2} divider title={t({ en: "Account", zh: "账户" })}>
        <div>
          <SignOutButton />
        </div>
      </Section>
    </div>
  );
}
