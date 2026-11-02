import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { getAssistantDb } from "../db/get-assistant-db.ts";
import { readReportSettings } from "../report/read-report-settings.ts";
import { PushToggle } from "./push-toggle.tsx";
import { SettingsForm } from "./settings-form.tsx";
import { SettingsSection } from "./settings-section.tsx";

/** The time and language of the morning report, and its notification. */
export async function ReportSettingsSection({ userId }: { userId: string }) {
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
