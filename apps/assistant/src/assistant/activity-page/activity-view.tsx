import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Divider } from "@tuja/ui/components/divider";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type { ActivityEntry, ActivityRun } from "../activity/read-activity.ts";
import { AddressText } from "../mailboxes/address-text.tsx";
import { MailboxesLink } from "../mailboxes/mailboxes-link.tsx";
import type { MailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import { ReconnectCause } from "../mailboxes/reconnect-cause.tsx";
import { LAST_TRY_HOUR, localClock } from "../report/due-report-date.ts";
import { daysBetween, formatDay } from "../report-page/format-day.ts";
import { fillTemplate } from "../shell/fill-template.tsx";
import { keepHyphenated } from "../shell/keep-hyphenated.tsx";
import { ItemRow } from "./item-row.tsx";
import { UndoButton, UndoScope, UndoStatus } from "./undo-button.tsx";

interface Place {
  timeZone: string;
  locale: SupportedLocale;
  /** The locale the page writes dates and times in. */
  dateLocale: string;
}

function formatClock(date: Date, { timeZone, dateLocale }: Place) {
  return new Intl.DateTimeFormat(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

function TaskName({ run }: { run: ActivityRun }) {
  switch (run.task) {
    case "report":
      return t({ en: "Morning report", zh: "晨报" });
    case "report-preview":
      return t({ en: "Morning report preview", zh: "晨报预览" });
    case "organise":
      return t({ en: "Inbox tidy", zh: "整理收件箱" });
  }
}

function StatusBadge({ run }: { run: ActivityRun }) {
  switch (run.status) {
    case "failed":
      return (
        <Badge size="sm" intent="destructive">
          {t({ en: "Failed", zh: "失败" })}
        </Badge>
      );
    case "interrupted":
      return (
        <Badge size="sm" intent="warning">
          {t({ en: "Interrupted", zh: "中断" })}
        </Badge>
      );
    case "stopped":
      return (
        <Badge size="sm" intent="neutral">
          {t({ en: "Ran out of time", zh: "时间用完" })}
        </Badge>
      );
    case "running":
      return (
        <Badge size="sm" intent="info">
          {t({ en: "Running", zh: "运行中" })}
        </Badge>
      );
    case "done":
      return null;
  }
}

type Reconnect = MailboxHealth["reconnect"];

/**
 * Why a run failed and what happens next, per task. A mailbox that refused
 * its login before the run ended comes first, because only the owner can
 * fix it.
 */
function FailedRunNote({
  run,
  place,
  reconnect,
}: {
  run: ActivityRun;
  place: Place;
  reconnect: Reconnect;
}) {
  const end = run.endedAt ?? run.startedAt;
  const refused = reconnect.filter(
    (mailbox) => mailbox.since === null || mailbox.since <= end,
  );
  const mailboxes = <MailboxesLink />;
  const lastTry =
    localClock(run.startedAt, place.timeZone).hour >= LAST_TRY_HOUR;
  const refusedLogin = t({
    en: "The assistant skips {address} until you connect it again in {mailboxes}. {cause}",
    zh: "在你到{mailboxes}重新连接之前，助手会跳过 {address}。{cause}",
  });
  return (
    <div css={stack.text}>
      {refused.map((mailbox) => (
        <Text key={mailbox.address} as="p" look="bodySmall" measure="none">
          {fillTemplate(refusedLogin, {
            address: <AddressText address={mailbox.address} />,
            mailboxes,
            cause: <ReconnectCause code={mailbox.code} />,
          })}
        </Text>
      ))}
      <Text as="p" look="bodySmall" measure="none">
        {run.task === "organise"
          ? t({
              en: "The run stopped on an error. The next check, within 30 minutes, tries again.",
              zh: "这次运行因出错而停止，30 分钟内的下一次检查会再试。",
            })
          : run.task === "report-preview"
            ? fillTemplate(
                t({
                  en: "The preview stopped on an error. You can run it again on the {preview} page.",
                  zh: "预览因出错而停止。可以在{preview}页面重新运行。",
                }),
                {
                  preview: (
                    <Anchor
                      href={getLocalePath("/report-preview", place.locale)}
                    >
                      {t({ en: "preview", zh: "晨报预览" })}
                    </Anchor>
                  ),
                },
              )
            : lastTry
              ? t({
                  en: "The run stopped on an error. It was the day’s last try, so the next report comes tomorrow morning.",
                  zh: "这次运行因出错而停止。这是当天最后一次尝试，下一份晨报明天早上写。",
                })
              : t({
                  en: "The run stopped on an error. The report tries again every hour until it is written.",
                  zh: "这次运行因出错而停止。晨报写好之前，每小时会再试一次。",
                })}
      </Text>
      {run.errorMessage ? (
        <Text as="p" look="bodySmall" tone="muted" measure="none">
          {run.errorMessage}
        </Text>
      ) : null}
    </div>
  );
}

function RunEntry({
  run,
  place,
  reconnect,
}: {
  run: ActivityRun;
  place: Place;
  reconnect: Reconnect;
}) {
  const changes =
    run.actions === 1
      ? t({ en: "1 change", zh: "1 项更改" })
      : t({ en: "{count} changes", zh: "{count} 项更改" }).replace(
          "{count}",
          String(run.actions),
        );
  return (
    <article>
      <List>
        <li css={listSurface.item}>
          <header css={[listSurface.row, styles.row]}>
            <div css={[styles.runHead, styles.grow]}>
              <div css={stack.text}>
                <div css={styles.runTitle}>
                  <Heading level={3} look="h4">
                    <TaskName run={run} />
                  </Heading>
                  <StatusBadge run={run} />
                </div>
                <Text look="bodySmall" tone="muted" numeric>
                  <MetaLine
                    facts={[
                      formatClock(run.startedAt, place),
                      run.actions > 0 && changes,
                    ]}
                  />
                </Text>
              </div>
              <div css={[stack.tight, styles.wide]}>
                {run.note ? (
                  <Text as="p" look="bodySmall" measure="none" verbatim>
                    {keepHyphenated(run.note)}
                  </Text>
                ) : null}
                {run.status === "failed" ? (
                  <FailedRunNote
                    run={run}
                    place={place}
                    reconnect={reconnect}
                  />
                ) : null}
                {run.status === "interrupted" ? (
                  <Text as="p" look="bodySmall" tone="muted" measure="none">
                    {run.actions > 0
                      ? t({
                          en: "The run was cut off before it finished. What it changed until then is below.",
                          zh: "这次运行没有完成就被中断了。中断前做的更改列在下面。",
                        })
                      : t({
                          en: "The run was cut off before it finished. It changed nothing.",
                          zh: "这次运行没有完成就被中断了，没有做任何更改。",
                        })}
                  </Text>
                ) : null}
                {run.task === "report" && !run.note && run.status === "done" ? (
                  <Text as="p" look="bodySmall" measure="none">
                    {t({
                      en: "Wrote the morning report.",
                      zh: "写好了晨报。",
                    })}
                  </Text>
                ) : null}
              </div>
              {run.undoable > 1 ? (
                <UndoScope
                  target={{ runId: run.id }}
                  confirm={t({
                    en: "Undo {count} changes",
                    zh: "撤销 {count} 项更改",
                  }).replace("{count}", String(run.undoable))}
                >
                  <div css={styles.action}>
                    <UndoButton label={t({ en: "Undo all", zh: "全部撤销" })} />
                  </div>
                  <UndoStatus css={styles.runStatus} />
                </UndoScope>
              ) : null}
            </div>
          </header>
        </li>
        {run.items.map((item, index) => (
          <ItemRow key={index} item={item} dateLocale={place.dateLocale} />
        ))}
      </List>
    </article>
  );
}

function QuietLine({
  entry,
  place,
}: {
  entry: Extract<ActivityEntry, { type: "quiet" }>;
  place: Place;
}) {
  const text =
    entry.task === "report-preview"
      ? entry.count === 1
        ? t({
            en: "A morning report preview at {first} changed nothing",
            zh: "{first} 生成了一次晨报预览，没有更改",
          })
        : t({
            en: "{count} morning report previews from {first} to {last} changed nothing",
            zh: "{first} 到 {last} 生成了 {count} 次晨报预览，没有更改",
          })
      : entry.count === 1
        ? t({
            en: "A check at {first} changed nothing",
            zh: "{first} 检查了一次，没有更改",
          })
        : t({
            en: "{count} checks from {first} to {last} changed nothing",
            zh: "{first} 到 {last} 检查了 {count} 次，没有更改",
          });
  return (
    <FlowBlock css={[flex.row, styles.quiet]}>
      <Text as="p" look="caption" tone="muted" numeric>
        {text
          .replace("{count}", String(entry.count))
          .replace("{first}", formatClock(entry.first, place))
          .replace("{last}", formatClock(entry.last, place))}
      </Text>
      <div css={styles.quietRule} aria-hidden>
        <Divider />
      </div>
    </FlowBlock>
  );
}

function DayName({
  date,
  today,
  locale,
}: {
  date: string;
  today: string;
  locale: string;
}) {
  const days = daysBetween(date, today);
  if (days === 0) return t({ en: "Today", zh: "今天" });
  if (days === 1) return t({ en: "Yesterday", zh: "昨天" });
  return formatDay(date, locale);
}

/**
 * What the agents did, newest first, by day: each run with its note and its
 * changes in words, each with the agent's reason and an undo.
 */
export function ActivityView({
  entries,
  earlier,
  now,
  place,
  reconnect,
}: {
  entries: readonly ActivityEntry[];
  /** Where the next page starts; null when there is none. */
  earlier: Date | null;
  now: Date;
  place: Place;
  /** Mailboxes that must be connected again. */
  reconnect: Reconnect;
}) {
  const today = localClock(now, place.timeZone).date;
  const days: { date: string; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const at = entry.type === "run" ? entry.startedAt : entry.last;
    const date = localClock(at, place.timeZone).date;
    const day = days.at(-1);
    if (day?.date === date) day.entries.push(entry);
    else days.push({ date, entries: [entry] });
  }
  return (
    <div css={stack.section}>
      {days.map((day) => (
        <FlowBlock as="section" key={day.date} css={stack.tight}>
          <Heading level={2}>
            <DayName date={day.date} today={today} locale={place.dateLocale} />
          </Heading>
          <div css={stack.item}>
            {day.entries.map((entry) =>
              entry.type === "run" ? (
                <RunEntry
                  key={entry.id}
                  run={entry}
                  place={place}
                  reconnect={reconnect}
                />
              ) : (
                <QuietLine
                  key={`quiet-${entry.task}-${entry.first.toISOString()}`}
                  entry={entry}
                  place={place}
                />
              ),
            )}
          </div>
        </FlowBlock>
      ))}
      {earlier ? (
        <FlowBlock>
          <Button
            href={`${getLocalePath("/activity", place.locale)}?before=${encodeURIComponent(earlier.toISOString())}`}
            look="ghost"
            size="sm"
          >
            {t({ en: "Earlier", zh: "更早" })}
          </Button>
        </FlowBlock>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  row: {
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  grow: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  runHead: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) fit-content(50%)",
    alignItems: "start",
    columnGap: rhythm.tight,
  },
  wide: {
    gridColumn: "1 / -1",
    display: { default: "flex", ":empty": "none" },
    marginBlockStart: rhythm.tight,
  },
  runStatus: {
    gridColumn: "1 / -1",
    marginBlockStart: { default: 0, ":not(:empty)": rhythm.tight },
  },
  action: {
    gridColumn: 2,
    gridRow: 1,
  },
  quiet: {
    gap: rhythm.tight,
    // The same block padding as a run card's header row, so the note's text sits where a card's title does.
    paddingBlock: space._2,
  },
  quietRule: {
    flexGrow: 1,
    minInlineSize: space._7,
  },
  runTitle: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
  },
});
