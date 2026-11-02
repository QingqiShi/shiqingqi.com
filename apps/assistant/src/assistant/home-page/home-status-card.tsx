"use client";

import { ClockCountdownIcon } from "@phosphor-icons/react/dist/ssr/ClockCountdown";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex, shrink } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type { AgentActivity } from "../agent/agent-activity.ts";
import { formatClock } from "../home/format-clock.ts";
import type { RunChange } from "../home/run-change.ts";
import type { HomeRun, HomeStatus, HomeView } from "../home/types.ts";
import { fillTemplate } from "../shell/fill-template.tsx";
import { ActivitySentence } from "./activity-sentence.tsx";
import { useHomeStatus } from "./use-home-status.ts";

const RECENT_SHOWN = 3;

function senderOf(activity: AgentActivity) {
  return "sender" in activity && activity.sender ? activity.sender : null;
}

function InFlight({ activity }: { activity: AgentActivity }) {
  const sender = senderOf(activity);
  return (
    <li css={stack.text}>
      <Text as="p" look="bodySmall" css={styles.sentence}>
        <ActivitySentence activity={activity} ended={false} />
      </Text>
      {sender ? (
        <Text look="caption" tone="muted" css={[truncate.base, styles.line]}>
          {sender}
        </Text>
      ) : null}
    </li>
  );
}

function runTitle(task: HomeRun["task"]) {
  switch (task) {
    case "report":
      return t({ en: "Writing the morning report", zh: "正在写晨报" });
    case "report-preview":
      return t({ en: "Previewing the next report", zh: "正在预览下一份晨报" });
    case "organise":
      return t({ en: "Organising the inbox", zh: "正在整理收件箱" });
  }
}

function RunningCard({ run, elapsedMs }: { run: HomeRun; elapsedMs: number }) {
  const locale = useLocale();
  const { inFlight, recent } = run.progress;
  return (
    <div css={[cardSurface.base, stack.tight, styles.card]}>
      <div css={[flex.between, styles.head]}>
        <div css={[row.inline, styles.title]}>
          <span css={[typeRole.label, flex.row, shrink._0]}>
            <Spinner size="inline" tone="accent" aria-hidden />
          </span>
          <Text look="label" weight="semibold">
            {runTitle(run.task)}
          </Text>
        </div>
        <Text look="caption" tone="muted" numeric css={shrink._0}>
          {fillTemplate(t({ en: "Running for {time}", zh: "已运行 {time}" }), {
            time: formatClock(Math.floor(elapsedMs / 1000)),
          })}
        </Text>
      </div>
      {inFlight.length > 0 ? (
        <ul css={[stack.rows, styles.list]}>
          {inFlight.map((activity, index) => (
            <InFlight key={index} activity={activity} />
          ))}
        </ul>
      ) : (
        <Text as="p" look="bodySmall">
          {t({
            en: "Thinking about the next step",
            zh: "正在考虑下一步",
          })}
        </Text>
      )}
      {recent.length > 0 ? (
        <ul css={stack.rows}>
          {recent.slice(0, RECENT_SHOWN).map((activity, index) => (
            <li
              key={index}
              css={[typeRole.caption, truncate.base, styles.recent]}
            >
              <ActivitySentence activity={activity} ended />
            </li>
          ))}
        </ul>
      ) : null}
      <Text look="caption">
        <Anchor href={getLocalePath("/activity", locale)}>
          {t({ en: "See the activity", zh: "查看动态" })}
        </Anchor>
      </Text>
    </div>
  );
}

function CountdownCard({ remainingMs }: { remainingMs: number }) {
  return (
    <div css={[cardSurface.base, row.inline, styles.card]}>
      <span css={[typeRole.label, flex.row, shrink._0, styles.glyph]}>
        <ClockCountdownIcon weight="regular" aria-hidden />
      </span>
      <Text look="label">
        {fillTemplate(
          t({ en: "Organising in {time}", zh: "{time} 后开始整理" }),
          {
            time: (
              <span css={[typeModifier.numeric, styles.time]}>
                {formatClock(Math.ceil(remainingMs / 1000))}
              </span>
            ),
          },
        )}
      </Text>
    </div>
  );
}

function CheckingCard() {
  return (
    <div css={[cardSurface.base, row.inline, styles.card]}>
      <span css={[typeRole.label, flex.row, shrink._0]}>
        <Spinner size="inline" tone="accent" aria-hidden />
      </span>
      <Text look="label">
        {t({ en: "Checking the inbox", zh: "正在检查收件箱" })}
      </Text>
    </div>
  );
}

function Announcement({ change }: { change: RunChange | null }) {
  if (!change) return null;
  if (change.change === "started") {
    switch (change.task) {
      case "report":
        return t({
          en: "The assistant started the morning report.",
          zh: "助手开始写晨报了。",
        });
      case "report-preview":
        return t({
          en: "The assistant started the report preview.",
          zh: "助手开始预览晨报了。",
        });
      case "organise":
        return t({
          en: "The assistant started to organise the inbox.",
          zh: "助手开始整理收件箱了。",
        });
    }
  }
  switch (change.task) {
    case "report":
      return t({
        en: "The assistant finished the morning report.",
        zh: "助手写完了晨报。",
      });
    case "report-preview":
      return t({
        en: "The assistant finished the report preview.",
        zh: "助手写完了晨报预览。",
      });
    case "organise":
      return t({
        en: "The assistant finished organising the inbox.",
        zh: "助手整理完了收件箱。",
      });
  }
}

/**
 * What the agents do now, at the top of `/`: a run that goes on, else the
 * countdown to the next organise run. Mostly it shows nothing. The live
 * region stays in the page, because a screen reader announces only a change
 * in a region that it already knows.
 */
export function HomeStatusCard({
  seed,
  view,
}: {
  /** The status of the server's render. */
  seed: HomeStatus;
  view: HomeView;
}) {
  const { card, change } = useHomeStatus(seed, view);
  return (
    <>
      <span role="status" css={a11y.srOnly}>
        <Announcement change={change} />
      </span>
      {card.kind === "running" ? (
        <RunningCard run={card.run} elapsedMs={card.elapsedMs} />
      ) : card.kind === "countdown" ? (
        <CountdownCard remainingMs={card.remainingMs} />
      ) : card.kind === "checking" ? (
        <CheckingCard />
      ) : null}
    </>
  );
}

const styles = stylex.create({
  card: {
    paddingBlock: space._3,
    paddingInline: space._4,
    minInlineSize: 0,
  },
  head: {
    gap: rhythm.inline,
    flexWrap: "wrap",
  },
  title: {
    minInlineSize: 0,
  },
  glyph: {
    color: color.fgMuted,
  },
  time: {
    fontWeight: font.weight_6,
  },
  list: {
    gap: rhythm.inline,
  },
  sentence: {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    overflowWrap: "anywhere",
  },
  line: {
    display: "block",
    minInlineSize: 0,
  },
  recent: {
    color: color.fgMuted,
    minInlineSize: 0,
  },
});
