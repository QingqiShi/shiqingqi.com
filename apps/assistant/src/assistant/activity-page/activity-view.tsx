import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ActivityEntry, ActivityRun } from "../activity/read-activity.ts";
import { localClock } from "../report/due-report-date.ts";
import { daysBetween, formatDay } from "../report-page/format-day.ts";
import { DayHeader } from "../shell/day-header.tsx";
import { ItemRow } from "./item-row.tsx";
import { UndoButton } from "./undo-button.tsx";

interface Place {
  timeZone: string;
  locale: SupportedLocale;
}

function formatClock(date: Date, { timeZone, locale }: Place) {
  return new Intl.DateTimeFormat(locale, {
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
        <Badge size="sm" intent="danger">
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

function RunEntry({ run, place }: { run: ActivityRun; place: Place }) {
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
            <div css={[stack.tight, styles.grow]}>
              <div css={stack.text}>
                <div css={styles.runTitle}>
                  <Heading level={3} css={[typeRole.label, styles.runName]}>
                    <TaskName run={run} />
                  </Heading>
                  <StatusBadge run={run} />
                </div>
                <Text look="caption" tone="muted" numeric>
                  {formatClock(run.startedAt, place)}
                  {run.actions > 0 ? ` · ${changes}` : null}
                </Text>
              </div>
              {run.note ? (
                <Text as="p" look="bodySmall">
                  {run.note}
                </Text>
              ) : null}
              {run.status === "failed" ? (
                <div css={stack.text}>
                  <Text as="p" look="bodySmall">
                    {t({
                      en: "The run stopped on an error. The next run tries again.",
                      zh: "这次运行因出错而停止，下一次运行会再试。",
                    })}
                  </Text>
                  {run.errorMessage ? (
                    <Text as="p" look="caption" tone="muted">
                      {run.errorMessage}
                    </Text>
                  ) : null}
                </div>
              ) : null}
              {run.status === "interrupted" ? (
                <Text as="p" look="caption" tone="muted">
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
                <Text as="p" look="bodySmall">
                  {t({
                    en: "Wrote the morning report.",
                    zh: "写好了晨报。",
                  })}
                </Text>
              ) : null}
              {run.task === "report-preview" &&
              !run.note &&
              run.status === "done" ? (
                <Text as="p" look="bodySmall">
                  {t({
                    en: "Wrote a preview of the morning report and changed nothing.",
                    zh: "写好了晨报预览，没有做任何更改。",
                  })}
                </Text>
              ) : null}
            </div>
            {run.undoable > 1 ? (
              <UndoButton
                target={{ runId: run.id }}
                label={t({ en: "Undo all", zh: "全部撤销" })}
                confirm={t({
                  en: "Undo {count} changes",
                  zh: "撤销 {count} 项更改",
                }).replace("{count}", String(run.undoable))}
              />
            ) : null}
          </header>
        </li>
        {run.items.map((item, index) => (
          <ItemRow key={index} item={item} locale={place.locale} />
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
    entry.count === 1
      ? t({
          en: "A check at {first} changed nothing",
          zh: "{first} 检查了一次，没有更改",
        })
      : t({
          en: "{count} checks from {first} to {last} changed nothing",
          zh: "{first} 到 {last} 检查了 {count} 次，没有更改",
        });
  return (
    <Text as="p" look="caption" tone="muted" numeric>
      {text
        .replace("{count}", String(entry.count))
        .replace("{first}", formatClock(entry.first, place))
        .replace("{last}", formatClock(entry.last, place))}
    </Text>
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
}: {
  entries: readonly ActivityEntry[];
  /** Where the next page starts; null when there is none. */
  earlier: Date | null;
  now: Date;
  place: Place;
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
    <div css={stack.group}>
      {days.map((day) => (
        <section key={day.date} css={stack.tight}>
          <DayHeader level={2}>
            <DayName date={day.date} today={today} locale={place.locale} />
          </DayHeader>
          <div css={stack.item}>
            {day.entries.map((entry) =>
              entry.type === "run" ? (
                <RunEntry key={entry.id} run={entry} place={place} />
              ) : (
                <QuietLine
                  key={`quiet-${entry.first.toISOString()}`}
                  entry={entry}
                  place={place}
                />
              ),
            )}
          </div>
        </section>
      ))}
      {earlier ? (
        <div>
          <Button
            href={`${getLocalePath("/activity", place.locale)}?before=${encodeURIComponent(earlier.toISOString())}`}
            look="ghost"
            size="sm"
          >
            {t({ en: "Earlier", zh: "更早" })}
          </Button>
        </div>
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
  runTitle: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
  },
  runName: {
    fontWeight: font.weight_6,
  },
});
