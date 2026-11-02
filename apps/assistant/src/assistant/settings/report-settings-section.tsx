import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import { Link } from "#src/links/link.tsx";
import { getAssistantDb } from "../db/get-assistant-db.ts";
import { readReportSettings } from "../report/read-report-settings.ts";
import { PushToggle } from "./push-toggle.tsx";
import { SettingsForm } from "./settings-form.tsx";
import { SettingsSection } from "./settings-section.tsx";

/** The time and language of the morning report, and its notification. */
export async function ReportSettingsSection({
  userId,
  locale,
}: {
  userId: string;
  locale: SupportedLocale;
}) {
  const settings = await readReportSettings({ db: getAssistantDb(), userId });
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(settings.timeZone)) timeZones.push(settings.timeZone);

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Report and notifications", zh: "晨报与通知" })}
    >
      <div css={stack.section}>
        <SettingsSection
          level={3}
          title={t({ en: "Morning report", zh: "晨报" })}
        >
          <SettingsForm initial={settings} timeZones={timeZones} />
          <div css={styles.preview}>
            <List>
              <ListRow
                href={getLocalePath("/report-preview", locale)}
                linkComponent={Link}
                detail={t({
                  en: "Changes no mail, to-dos or reports.",
                  zh: "不会改动邮件、待办或晨报。",
                })}
              >
                {t({ en: "Preview the next report", zh: "预览下一份晨报" })}
              </ListRow>
            </List>
          </div>
        </SettingsSection>
        <SettingsSection
          level={3}
          title={t({ en: "Notifications", zh: "通知" })}
        >
          <PushToggle
            publicKey={
              process.env.NEXT_PUBLIC_ASSISTANT_VAPID_PUBLIC_KEY ?? null
            }
          />
        </SettingsSection>
      </div>
    </SettingsSection>
  );
}

const styles = stylex.create({
  preview: { maxInlineSize: measure.form },
});
