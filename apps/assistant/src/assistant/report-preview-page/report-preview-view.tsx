import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import type { ReportPreview } from "../report/read-report-preview.ts";
import { ReportView } from "../report-page/report-view.tsx";
import { TodosReadOnly } from "../report-page/todos-read-only.tsx";
import { ReportPreviewControls } from "./report-preview-controls.tsx";

function FailureText({
  reason,
}: {
  reason: Extract<ReportPreview, { status: "failed" }>["reason"];
}) {
  switch (reason) {
    case "no-model":
      return t({
        en: "No model is set up to write the report.",
        zh: "没有配置撰写晨报的模型。",
      });
    case "no-mailbox":
      return t({
        en: "No mailbox could be read. Check your mailboxes and try again.",
        zh: "没有可读取的邮箱。请检查邮箱后重试。",
      });
    case "no-report":
      return t({
        en: "The agent ran but did not submit a report. The activity page shows what it did.",
        zh: "智能体运行了，但没有提交晨报。可以在动态页面查看它做了什么。",
      });
    case "interrupted":
      return t({
        en: "The run was cut off before it finished.",
        zh: "这次运行没有完成就被中断了。",
      });
    case "error":
      return t({
        en: "The run stopped on an error. The activity page may show more.",
        zh: "运行因错误而停止。动态页面可能有更多信息。",
      });
  }
}

/**
 * The preview page: what a preview is and does not do, the button that starts
 * one, and the latest preview, running, failed or done. A done preview shows
 * as the report would, with no to-do that can be ticked.
 */
export function ReportPreviewView({
  preview,
  today,
  timeZone,
  locale,
}: {
  preview: ReportPreview | null;
  /** The user's local date, for the due dates. */
  today: string;
  timeZone: string;
  locale: SupportedLocale;
}) {
  return (
    <div css={stack.group}>
      <header css={stack.item}>
        <div>
          <AnchorButton
            href={getLocalePath("/settings/report", locale)}
            look="ghost"
            size="sm"
            icon={<ArrowLeftIcon weight="bold" />}
          >
            {t({ en: "Report and notifications", zh: "晨报与通知" })}
          </AnchorButton>
        </div>
        <div css={stack.text}>
          <Heading level={1} look="h3">
            {t({ en: "Morning report preview", zh: "晨报预览" })}
          </Heading>
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "This is a preview, not a report. The report agent reads the real mail of the last 24 hours and your calendar, and shows what it would write. No mail is marked read, no to-do changes and nothing is pushed.",
              zh: "这只是预览，不是正式晨报。晨报智能体会读取过去 24 小时的真实邮件和你的日历，并展示它会写的内容。不会有邮件被标为已读，待办不会改动，也不会推送通知。",
            })}
          </Text>
        </div>
        <ReportPreviewControls
          running={preview?.status === "running"}
          hasPreview={preview !== null}
        />
      </header>
      {preview?.status === "running" ? (
        <div role="status" css={[cluster.inline, styles.running]}>
          <Spinner size="sm" aria-hidden />
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "The agent is reading your mail. This can take some minutes; you can leave this page and come back.",
              zh: "智能体正在读取邮件，可能需要几分钟。你可以先离开，稍后再回来。",
            })}
          </Text>
        </div>
      ) : null}
      {preview?.status === "failed" ? (
        <Callout
          intent="danger"
          title={t({ en: "The preview failed", zh: "预览失败" })}
        >
          <FailureText reason={preview.reason} />
        </Callout>
      ) : null}
      {preview?.status === "done" ? (
        <div css={stack.item}>
          <Text as="p" look="caption" tone="muted">
            {t({ en: "Written at {time}", zh: "写于 {time}" }).replace(
              "{time}",
              new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                hourCycle: "h23",
                timeZone,
              }).format(preview.builtAt),
            )}
          </Text>
          <TodosReadOnly>
            <ReportView
              report={preview.report}
              today={today}
              timeZone={timeZone}
              openTodos={preview.openTodos}
              locale={locale}
              headingLevel={2}
              pastLink={null}
              renderedAt={preview.builtAt.getTime()}
            />
          </TodosReadOnly>
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  running: {
    flexWrap: "nowrap",
  },
});
