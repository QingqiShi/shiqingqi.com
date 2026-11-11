import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { measure, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import { ConnectMailboxFirst } from "../mailboxes/connect-mailbox-first.tsx";
import type { ReportPreview } from "../report/read-report-preview.ts";
import { formatTimeInZone } from "../report-page/format-day.ts";
import { ReportView } from "../report-page/report-view.tsx";
import { TodosReadOnly } from "../report-page/todos-read-only.tsx";
import { fillTemplate } from "../shell/fill-template.tsx";
import { ReportPreviewControls } from "./report-preview-controls.tsx";

function FailureText({
  reason,
  locale,
}: {
  reason: Extract<ReportPreview, { status: "failed" }>["reason"];
  locale: SupportedLocale;
}) {
  const activity = (
    <Anchor href={getLocalePath("/activity", locale)}>
      {t({ en: "The activity page", zh: "动态页面" })}
    </Anchor>
  );
  switch (reason) {
    case "no-model":
      return t({
        en: "No model is set up to write the report.",
        zh: "没有配置撰写晨报的模型。",
      });
    case "no-mailbox":
      return fillTemplate(
        t({
          en: "No mailbox could be read. Check your {mailboxes} and try again.",
          zh: "没有可读取的邮箱。请检查{mailboxes}后重试。",
        }),
        {
          mailboxes: (
            <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
              {t({ en: "mailboxes", zh: "邮箱" })}
            </Anchor>
          ),
        },
      );
    case "no-report":
      return fillTemplate(
        t({
          en: "The agent ran but did not submit a report. {activity} shows what it did.",
          zh: "智能体运行了，但没有提交晨报。可以在{activity}查看它做了什么。",
        }),
        { activity },
      );
    case "interrupted":
      return t({
        en: "The run was cut off before it finished.",
        zh: "这次运行没有完成就被中断了。",
      });
    case "error":
      return fillTemplate(
        t({
          en: "The run stopped on an error. {activity} may show more.",
          zh: "运行因错误而停止。{activity}可能有更多信息。",
        }),
        { activity },
      );
  }
}

/**
 * The preview page: what a preview is and does not do, the button that starts
 * one, and the latest preview, running, failed or done. A done preview shows
 * as the report would, with no to-do that can be ticked; a failed one keeps
 * the last built preview below the failure.
 */
export function ReportPreviewView({
  preview,
  today,
  timeZone,
  locale,
  dateLocale,
  hasMailbox,
}: {
  preview: ReportPreview | null;
  /** The user's local date, for the due dates. */
  today: string;
  timeZone: string;
  locale: SupportedLocale;
  /** The locale the page writes dates in. */
  dateLocale: string;
  /** The owner has connected a mailbox, which a preview reads. */
  hasMailbox: boolean;
}) {
  const built =
    preview?.status === "done"
      ? preview
      : preview?.status === "failed"
        ? (preview.last ?? null)
        : null;
  const builtTime = built
    ? formatTimeInZone(built.builtAt.toISOString(), {
        today,
        locale: dateLocale,
        timeZone,
      })
    : null;
  const written =
    preview?.status === "done" && builtTime !== null
      ? t({ en: "Written at {time}", zh: "写于 {time}" }).replace(
          "{time}",
          builtTime,
        )
      : null;

  return (
    <div css={stack.group}>
      <header css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Morning report preview", zh: "晨报预览" })}
        </Heading>
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "This is a preview, not a report. The report agent reads the real mail of the last 24 hours and your calendar, and shows what it would write. No mail is marked read, no to-do changes and nothing is pushed.",
            zh: "这只是预览，不是正式晨报。晨报智能体会读取过去 24 小时的真实邮件和你的日历，并展示它会写的内容。不会有邮件被标为已读，待办不会改动，也不会推送通知。",
          })}
        </Text>
      </header>
      <div css={stack.item}>
        {hasMailbox ? null : (
          <div css={[typeRole.bodySmall, styles.measure]}>
            <ConnectMailboxFirst
              why={t({
                en: "The preview reads your mailboxes, and none is connected yet.",
                zh: "预览要读取你的邮箱，而现在还没有连接任何邮箱。",
              })}
            />
          </div>
        )}
        {hasMailbox ? (
          <ReportPreviewControls
            running={preview?.status === "running"}
            hasPreview={preview !== null}
          >
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
            ) : written === null ? undefined : (
              <Text as="p" look="bodySmall" tone="muted">
                {written}
              </Text>
            )}
          </ReportPreviewControls>
        ) : null}
        {preview?.status === "failed" ? (
          <div css={[typeRole.bodySmall, styles.measure]}>
            <Callout
              intent="destructive"
              title={t({ en: "The preview failed", zh: "预览失败" })}
            >
              <FailureText reason={preview.reason} locale={locale} />
            </Callout>
          </div>
        ) : null}
        {preview?.status === "failed" && builtTime !== null ? (
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "Below is the last preview, written at {time}.",
              zh: "下面是上一次的预览，写于 {time}。",
            }).replace("{time}", builtTime)}
          </Text>
        ) : null}
        {built ? (
          <div css={[corner.radius_4, styles.sample]}>
            <TodosReadOnly>
              <ReportView
                report={built.report}
                today={today}
                timeZone={timeZone}
                openTodos={built.openTodos}
                locale={locale}
                dateLocale={dateLocale}
                headingLevel={2}
                preview
                renderedAt={built.builtAt.getTime()}
              />
            </TodosReadOnly>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = stylex.create({
  running: {
    flexWrap: "nowrap",
  },
  // The callout has the width of the paragraph above it. That paragraph is
  // bodySmall at the prose measure, so this box uses the bodySmall size too.
  measure: {
    maxInlineSize: measure.prose,
  },
  sample: {
    backgroundColor: color.background,
    padding: { default: space._3, [breakpoints.md]: space._5 },
  },
});
