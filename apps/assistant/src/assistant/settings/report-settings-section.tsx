import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Link } from "@tuja/next-links/link";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { readRejectedTodos } from "../agent/todos/read-open-todos.ts";
import { getAssistantDb } from "../db/get-assistant-db.ts";
import { ConnectMailboxFirst } from "../mailboxes/connect-mailbox-first.tsx";
import { readMailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import { readReportSettings } from "../report/read-report-settings.ts";
import { PushToggle } from "./push-toggle.tsx";
import { RejectedTodoList } from "./rejected-todo-list.tsx";
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
  const scope = { db: getAssistantDb(), userId };
  const [
    { timeZone, digestHour, locale: reportLocale },
    rejectedTodos,
    mailboxes,
  ] = await Promise.all([
    readReportSettings(scope),
    readRejectedTodos(scope, new Date()),
    readMailboxHealth(scope),
  ]);
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(timeZone)) timeZones.push(timeZone);

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Report and notifications", zh: "晨报与通知" })}
      description={t({
        en: "Each morning the assistant sums up the last day’s mail and your calendar in one report.",
        zh: "助手每天早上把过去一天的邮件和你的日历汇总成一份晨报。",
      })}
    >
      <div css={stack.section}>
        <SettingsSection
          level={3}
          title={t({ en: "Morning report", zh: "晨报" })}
        >
          <SettingsForm
            initial={{ timeZone, digestHour, locale: reportLocale }}
            timeZones={timeZones}
          />
        </SettingsSection>
        <SettingsSection level={3} title={t({ en: "Preview", zh: "预览" })}>
          {mailboxes.connected === 0 ? (
            <ConnectMailboxFirst
              why={t({
                en: "The preview reads your mailboxes, and none is connected yet.",
                zh: "预览要读取你的邮箱，而现在还没有连接任何邮箱。",
              })}
            />
          ) : (
            <List>
              <ListRow
                href={getLocalePath("/report-preview", locale)}
                linkComponent={Link}
                detail={t({
                  en: "Changes no mail, to-dos or reports.",
                  zh: "不会改动邮件、待办或晨报。",
                })}
              >
                {t({ en: "See the next report now", zh: "现在查看下一份晨报" })}
              </ListRow>
            </List>
          )}
        </SettingsSection>
        <SettingsSection
          level={3}
          title={t({
            en: "To-dos the report should not add",
            zh: "晨报不该添加的待办",
          })}
          description={t({
            en: "The report reads these before it adds a to-do. Each one counts for 90 days.",
            zh: "晨报添加待办前会先看这些。每一条在 90 天内有效。",
          })}
        >
          <RejectedTodoList
            todos={rejectedTodos.map(({ id, title, note }) => ({
              id,
              title,
              note,
            }))}
          />
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
