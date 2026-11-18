"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight } from "@tuja/ui/tokens.stylex";
import type { ProposedBatch } from "#src/ai/ai-api.ts";
import { findMoment } from "#src/trips/ops/find-item.ts";
import { touchedIds } from "#src/trips/save/goes-with-theirs.ts";
import type { Trip } from "#src/trips/types.ts";
import { useAsk } from "./ask-provider.tsx";
import type { BatchCheck, Decision } from "./check-batches.ts";
import { dayPlan, isOnlyItsItem } from "./day-plan.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import { useDayLabels } from "./use-day-labels.ts";
import { useDescribe } from "./use-describe.ts";

const separator = " · ";

interface ChangedThing {
  id: string;
  kind: "added" | "removed" | "changed";
  title: string;
  /** How the thing is now, for the lines that the change takes away. */
  was: string[];
  /** How the thing is after the change. */
  becomes: string[];
  /** What goes with a day that the change removes. */
  goesWith?: string;
}

/** The things that a batch adds, removes or changes, from the trip before it and the trip after it. */
function useChangedThings() {
  const describe = useDescribe();
  const withPlan = t({
    en: "Everything planned on it goes with the day: {count} in all.",
    zh: "当天的全部安排会一并移除，共 {count} 项。",
  });
  return (batch: ProposedBatch, before: Trip, after: Trip): ChangedThing[] => {
    const ids = touchedIds(batch.ops);
    return ids.flatMap((id): ChangedThing[] => {
      const was = describe(before, id);
      const becomes = describe(after, id);
      const moment = findMoment(after, id)?.moment;
      // The words of a time name it. Its first line is its day and time.
      const title =
        moment?.text ??
        findMoment(before, id)?.moment.text ??
        becomes?.at(0) ??
        was?.at(0);
      if (title === undefined) return [];
      // A new time with one new item shows as that item.
      if (
        !was &&
        moment &&
        isOnlyItsItem(moment) &&
        ids.includes(moment.items[0].id)
      ) {
        return [];
      }
      const rest = (lines: string[]) => lines.filter((line) => line !== title);
      if (!was) {
        return [
          { id, kind: "added", title, was: [], becomes: rest(becomes ?? []) },
        ];
      }
      if (!becomes) {
        const day = before.days.find((each) => each.id === id);
        const count = day ? dayPlan(day).count : 0;
        return [
          {
            id,
            kind: "removed",
            title,
            was: rest(was),
            becomes: [],
            goesWith:
              count > 0
                ? withPlan.replace("{count}", String(count))
                : undefined,
          },
        ];
      }
      return [
        {
          id,
          kind: "changed",
          title,
          was: was.filter((line) => !becomes.includes(line)),
          becomes: becomes.filter((line) => !was.includes(line)),
        },
      ];
    });
  };
}

function Things({ things }: { things: ChangedThing[] }) {
  const kinds = {
    added: { label: t({ en: "New", zh: "新增" }), intent: "success" },
    removed: { label: t({ en: "Removed", zh: "移除" }), intent: "destructive" },
    changed: { label: t({ en: "Changed", zh: "修改" }), intent: "info" },
  } as const;
  const now = t({ en: "Now: {lines}", zh: "现在：{lines}" });
  const then = t({ en: "After: {lines}", zh: "改后：{lines}" });
  if (things.length === 0) return null;
  return (
    <ul css={[stack.tight, styles.things]}>
      {things.map((thing) => (
        <li key={thing.id} css={stack.text}>
          <span css={cluster.tight}>
            <Badge size="sm" intent={kinds[thing.kind].intent}>
              {kinds[thing.kind].label}
            </Badge>
            <Text as="span" look="bodySmall" weight="medium">
              {thing.title}
            </Text>
          </span>
          {thing.kind === "changed" ? (
            <>
              {thing.was.length > 0 ? (
                <Text look="caption" tone="muted">
                  {now.replace("{lines}", thing.was.join(separator))}
                </Text>
              ) : null}
              {thing.becomes.length > 0 ? (
                <Text look="caption">
                  {then.replace("{lines}", thing.becomes.join(separator))}
                </Text>
              ) : null}
            </>
          ) : thing.was.length + thing.becomes.length > 0 ? (
            <Text look="caption" tone="muted">
              {[...thing.was, ...thing.becomes].join(separator)}
            </Text>
          ) : null}
          {thing.goesWith ? <Text look="caption">{thing.goesWith}</Text> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The answer of the model: its words, and each change that it proposes,
 * for the person to accept or skip. Nothing changes before the person
 * accepts it. A change shows what it does to the trip as the trip is now,
 * so the list follows each edit of the person.
 */
export function ProposalView({ onDone }: { onDone: (rowId?: string) => void }) {
  const ask = useAsk();
  const editor = useEditor();
  const dayLabels = useDayLabels();
  const changedThings = useChangedThings();
  const showToast = useToast();
  const { answer, checks, decisions, open } = ask;

  const changeNumber = t({ en: "Change {number}", zh: "修改 {number}" });
  const acceptLabel = t({ en: "Accept", zh: "采纳" });
  const skipLabel = t({ en: "Skip", zh: "跳过" });
  const restoreLabel = t({ en: "Restore", zh: "恢复" });
  const acceptedLabel = t({ en: "Accepted", zh: "已采纳" });
  const skippedLabel = t({ en: "Skipped", zh: "已跳过" });
  const skippedToast = t({ en: "Change skipped", zh: "已跳过这项修改" });
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const acceptAll = t({ en: "Accept all {count}", zh: "全部采纳（{count}）" });
  const buildsOnOne = t({
    en: "This builds on change {number}.",
    zh: "这项修改以修改 {number} 为前提。",
  });
  const buildsOnMore = t({
    en: "This builds on the changes before it.",
    zh: "这项修改以前面的修改为前提。",
  });
  const acceptWithOne = t({
    en: "Accept with change {number}",
    zh: "连同修改 {number} 一起采纳",
  });
  const acceptWithMore = t({
    en: "Accept with the changes before it",
    zh: "连同前面的修改一起采纳",
  });
  const buildsOnSkipped = t({
    en: "This builds on change {number}, which you skipped.",
    zh: "这项修改以修改 {number} 为前提，而你跳过了它。",
  });
  const noLongerFits = t({
    en: "This no longer fits the trip.",
    zh: "这项修改已不适用于现在的行程。",
  });

  if (!answer) return null;
  const { batches } = answer;
  const numberOf = (index: number) => String(index + 1);

  const closeWhenDecided = (
    next: ReadonlyMap<number, Decision>,
    rowId?: string,
  ) => {
    if (next.size === batches.length) onDone(rowId);
    return next.size === batches.length;
  };
  const accept = (indexes: readonly number[]) => {
    const { made, rowId } = ask.accept(indexes);
    const next = new Map(decisions);
    for (const index of made) next.set(index, "accepted");
    closeWhenDecided(next, rowId);
  };
  const skip = (index: number) => {
    ask.skip(index);
    const isLast = closeWhenDecided(new Map(decisions).set(index, "skipped"));
    // The sheet is gone, so the way back is in the toast.
    if (isLast) {
      showToast({
        message: skippedToast,
        action: {
          label: undoLabel,
          onAction() {
            ask.restore(index);
          },
        },
      });
    }
  };

  const daysOf = (batch: ProposedBatch, check: BatchCheck | null) => {
    const trips =
      check && check.state !== "stale"
        ? [check.after, check.before]
        : [editor.trip];
    return batch.dayIds.flatMap((dayId) => {
      for (const trip of trips) {
        const index = trip.days.findIndex((day) => day.id === dayId);
        if (index >= 0) return [dayLabels.dated(trip.days[index], index)];
      }
      return [];
    });
  };

  const actionsOf = (index: number, check: BatchCheck | null) => {
    const decision = decisions.get(index);
    if (decision === "accepted") {
      return (
        <div css={[cluster.tight, styles.decided]}>
          <Text look="bodySmall" tone="success" weight="medium">
            {acceptedLabel}
          </Text>
          {/* The toast that offers the undo is under the sheet. */}
          {ask.undoable === index ? (
            <Button
              size="sm"
              look="ghost"
              disabled={!editor.canEdit}
              onClick={editor.undo}
            >
              {undoLabel}
            </Button>
          ) : null}
        </div>
      );
    }
    if (decision === "skipped") {
      return (
        <div css={[cluster.tight, styles.decided]}>
          <Text look="bodySmall" tone="muted">
            {skippedLabel}
          </Text>
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              ask.restore(index);
            }}
          >
            {restoreLabel}
          </Button>
        </div>
      );
    }
    if (!check || check.state === "stale") {
      const needed = check?.needs.at(0);
      return (
        <Text look="bodySmall" tone="warning">
          {needed === undefined
            ? noLongerFits
            : buildsOnSkipped.replace("{number}", numberOf(needed))}
        </Text>
      );
    }
    const skipButton = (
      <Button
        size="sm"
        look="ghost"
        onClick={() => {
          skip(index);
        }}
      >
        {skipLabel}
      </Button>
    );
    if (check.state === "waits") {
      const { needs } = check;
      const [only] = needs;
      const isOne = needs.length === 1;
      return (
        <div css={stack.tight}>
          <Text look="bodySmall" tone="muted">
            {isOne
              ? buildsOnOne.replace("{number}", numberOf(only))
              : buildsOnMore}
          </Text>
          <div css={[cluster.tight, styles.actions]}>
            {skipButton}
            <Button
              size="sm"
              disabled={!editor.canEdit}
              onClick={() => {
                accept([...needs, index]);
              }}
            >
              {isOne
                ? acceptWithOne.replace("{number}", numberOf(only))
                : acceptWithMore}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div css={[cluster.tight, styles.actions]}>
        {skipButton}
        <Button
          size="sm"
          look={open.length === 1 ? "primary" : undefined}
          disabled={!editor.canEdit}
          onClick={() => {
            accept([index]);
          }}
        >
          {acceptLabel}
        </Button>
      </div>
    );
  };

  return (
    <div css={stack.item}>
      <Callout intent="neutral" icon={<SparkleIcon weight="bold" />}>
        <span css={styles.words}>{answer.message}</span>
      </Callout>
      {batches.map((batch, index) => {
        const check = checks.at(index) ?? null;
        const days = daysOf(batch, check);
        return (
          <Card key={index} padding="sm">
            <div css={stack.tight}>
              <Text look="caption" tone="muted">
                {[
                  changeNumber.replace("{number}", numberOf(index)),
                  ...days,
                ].join(separator)}
              </Text>
              <Text weight="semibold" css={styles.words}>
                {batch.summary}
              </Text>
              {check && check.state !== "stale" ? (
                <Things
                  things={changedThings(batch, check.before, check.after)}
                />
              ) : null}
              {actionsOf(index, check)}
            </div>
          </Card>
        );
      })}
      <SheetActions>
        <Button
          look={open.length === 0 ? "primary" : "ghost"}
          onClick={() => {
            // With nothing left to accept, the person is done with the
            // answer, so the prompt stops its offer to review it.
            if (open.length === 0) {
              for (const index of ask.stale) ask.skip(index);
            }
            onDone();
          }}
        >
          {open.length === 0
            ? t({ en: "Close", zh: "关闭" })
            : t({ en: "Not now", zh: "稍后再说" })}
        </Button>
        {open.length > 1 ? (
          <Button
            look="primary"
            disabled={!editor.canEdit}
            onClick={() => {
              accept(open);
            }}
          >
            {acceptAll.replace("{count}", String(open.length))}
          </Button>
        ) : null}
      </SheetActions>
    </div>
  );
}

const styles = stylex.create({
  things: {
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  actions: {
    justifyContent: "flex-end",
  },
  // The words of a decision at the start, and the way back at the end. A
  // decision with no way back is as tall as one with it.
  decided: {
    justifyContent: "space-between",
    minBlockSize: controlHeight.sm,
  },
  // The model writes lines, and the screen keeps them.
  words: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
});
