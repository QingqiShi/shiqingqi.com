"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/ssr/BookmarkSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import type { TranscriptItem } from "#src/assistant/assistant-api.ts";
import { AssistantText } from "./assistant-text.tsx";
import { useSegmentDate } from "./use-segment-date.ts";
import type { TripAssistantModel } from "./use-trip-assistant.ts";

type ChangeItem = Extract<TranscriptItem, { type: "change" }>;

/** A stored line of one of these is a change that the server refused before it kept it. */
const CHANGE_TOOLS = new Set(["apply_changes", "propose_changes"]);

function useChangeWords() {
  return {
    applied: t({ en: "Changed", zh: "已修改" }),
    undone: t({ en: "Undone", zh: "已撤销" }),
    pending: t({ en: "Proposed", zh: "建议" }),
    accepted: t({ en: "Accepted", zh: "已接受" }),
    skipped: t({ en: "Skipped", zh: "已跳过" }),
    refused: {
      trip_changed: t({
        en: "Not saved: the trip changed in the same place after this was proposed",
        zh: "未保存：提出这项建议之后，行程的同一处已经改过",
      }),
      no_longer_fits: t({
        en: "Not saved: this no longer fits the trip as it is now",
        zh: "未保存：这项修改已不适用于现在的行程",
      }),
    },
  };
}

function useEventWords() {
  return {
    accepted: t({ en: "You accepted: {summary}", zh: "你接受了：{summary}" }),
    skipped: t({ en: "You skipped: {summary}", zh: "你跳过了：{summary}" }),
    undone: t({ en: "You undid: {summary}", zh: "你撤销了：{summary}" }),
    refused: t({
      en: "Could not apply: {summary}",
      zh: "无法应用：{summary}",
    }),
  };
}

function ChangeCard({
  item,
  model,
}: {
  item: ChangeItem;
  /** Null where the conversation only reads. */
  model: TripAssistantModel | null;
}) {
  const words = useChangeWords();
  const isDeciding = model?.deciding === item.changeId;
  const isWaiting =
    model !== null &&
    (model.isRunning || (model.deciding !== null && !isDeciding));
  const isPending = item.kind === "proposal" && item.status === "pending";
  const isDone = item.status === "undone" || item.status === "skipped";
  const status =
    item.status === "refused"
      ? words.refused[item.refusal ?? "trip_changed"]
      : words[item.status];
  return (
    <Card padding="sm" css={[stack.tight, isDone && styles.doneCard]}>
      <Text as="p" look="bodySmall" verbatim>
        {item.summary}
      </Text>
      <div css={[row.tight, styles.cardFoot]}>
        <Text
          as="span"
          look="caption"
          tone={item.status === "refused" ? "destructive" : "muted"}
        >
          {status}
        </Text>
        {model === null ? null : isPending ? (
          <div css={row.tight}>
            <Button
              size="sm"
              look="ghost"
              disabled={isWaiting || isDeciding}
              onClick={() => {
                void model.decide(item.changeId, "skip");
              }}
            >
              {t({ en: "Skip", zh: "跳过" })}
            </Button>
            <Button
              size="sm"
              look="primary"
              disabled={isWaiting}
              loading={isDeciding}
              onClick={() => {
                void model.decide(item.changeId, "accept");
              }}
            >
              {t({ en: "Accept", zh: "接受" })}
            </Button>
          </div>
        ) : item.canUndo ? (
          <Button
            size="sm"
            look="outline"
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            disabled={isWaiting}
            loading={isDeciding}
            onClick={() => {
              void model.decide(item.changeId, "undo");
            }}
          >
            {t({ en: "Undo", zh: "撤销" })}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function RememberedLine({
  item,
  onOpenMemory,
}: {
  item: Extract<TranscriptItem, { type: "remembered" }>;
  onOpenMemory?: () => void;
}) {
  const words =
    item.action === "deleted"
      ? t({ en: "Forgot a note", zh: "已删除一条记忆" })
      : t({ en: "Remembered", zh: "已记住" });
  const icon = <BookmarkSimpleIcon weight="bold" aria-hidden />;
  if (!onOpenMemory) {
    return (
      <div css={[row.tight, styles.quiet]}>
        {icon}
        <Text as="span" look="caption" tone="muted">
          {words}
        </Text>
      </div>
    );
  }
  return (
    <div>
      <Button
        size="xs"
        look="ghost"
        bleed="start"
        icon={icon}
        aria-label={t({
          en: "{words}: see what the assistant remembers",
          zh: "{words}：查看助手记住的内容",
        }).replace("{words}", words)}
        onClick={onOpenMemory}
      >
        {words}
      </Button>
    </div>
  );
}

function Item({
  item,
  isLast,
  model,
  onOpenMemory,
}: {
  item: TranscriptItem;
  isLast: boolean;
  model: TripAssistantModel | null;
  onOpenMemory?: () => void;
}) {
  const eventWords = useEventWords();
  switch (item.type) {
    case "member":
      return (
        <div css={styles.member}>
          <Text as="p" verbatim measure="none">
            {item.text}
          </Text>
        </div>
      );
    case "assistant":
      return <AssistantText text={item.text} />;
    case "tool":
      if (!CHANGE_TOOLS.has(item.tool) || item.key.startsWith("live:")) {
        return null;
      }
      return (
        <Text as="p" look="caption" tone="muted">
          {t({
            en: "A change did not go through",
            zh: "有一项修改没有成功",
          })}
        </Text>
      );
    case "change":
      return <ChangeCard item={item} model={model} />;
    case "question":
      return (
        <div css={stack.tight}>
          <Text as="p" verbatim>
            {item.question}
          </Text>
          {model && isLast && !model.isRunning && item.options.length > 0 ? (
            <div css={styles.options}>
              {item.options.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  look="outline"
                  onClick={() => {
                    void model.send(option);
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "remembered":
      return <RememberedLine item={item} onOpenMemory={onOpenMemory} />;
    case "event":
      return (
        <Text as="p" look="caption" tone="muted">
          {eventWords[item.decision].replace("{summary}", item.summary)}
        </Text>
      );
  }
}

/** A thin rule with the time at which the conversation began. */
function SegmentStart({ startedAt }: { startedAt: string }) {
  const dateOf = useSegmentDate();
  return (
    <div css={[row.tight, styles.start]}>
      <Divider css={styles.rule} />
      <Text as="span" look="caption" tone="muted" css={styles.startText}>
        {t({ en: "Started {date}", zh: "开始于 {date}" }).replace(
          "{date}",
          dateOf(startedAt),
        )}
      </Text>
      <Divider css={styles.rule} />
    </div>
  );
}

/** A stored conversation as it reads, with no action on it. */
export function ReadOnlyConversation({
  items,
  startedAt,
}: {
  items: readonly TranscriptItem[];
  startedAt: string;
}) {
  return (
    <div css={[stack.item, styles.log]}>
      <SegmentStart startedAt={startedAt} />
      {items.map((item, index) => (
        <Item
          key={item.key}
          item={item}
          isLast={index === items.length - 1}
          model={null}
        />
      ))}
    </div>
  );
}

/** The person's conversation with the assistant, oldest first, with its end in view. */
export function Conversation({
  model,
  onOpenMemory,
}: {
  model: TripAssistantModel;
  onOpenMemory: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const items = model.transcript;
  const lastItem = items.at(-1);
  const scrollKey = `${String(items.length)}:${lastItem?.type === "assistant" ? String(lastItem.text.length) : ""}`;

  useEffect(() => {
    let box = endRef.current?.parentElement ?? null;
    while (
      box &&
      !["auto", "scroll"].includes(getComputedStyle(box).overflowY)
    ) {
      box = box.parentElement;
    }
    box?.scrollTo({ top: box.scrollHeight });
  }, [scrollKey]);

  if (!model.isLoaded && model.transcript.length === 0) {
    return (
      <div css={[styles.log, styles.centred]}>
        {model.loadFailed ? (
          <div css={[stack.tight, styles.centredText]}>
            <Text as="p" tone="muted">
              {t({
                en: "The conversation did not load.",
                zh: "对话没有加载出来。",
              })}
            </Text>
            <div>
              <Button
                size="sm"
                onClick={() => {
                  void model.load();
                }}
              >
                {t({ en: "Try again", zh: "重试" })}
              </Button>
            </div>
          </div>
        ) : (
          <Spinner label={t({ en: "Loading", zh: "加载中" })} />
        )}
      </div>
    );
  }

  return (
    <div css={[stack.item, styles.log]} aria-live="polite">
      {items.length === 0 ? (
        <Text as="p" tone="muted" css={styles.empty}>
          {t({
            en: "Ask about this trip, or say what to change: move a dinner, swap two days, add a stop. Each change shows as a card that you can undo.",
            zh: "可以问关于这趟行程的问题，也可以直接说要改什么：挪一顿晚饭、对调两天、加一个停靠点。每项改动都显示为一张卡片，可以撤销。",
          })}
        </Text>
      ) : model.startedAt ? (
        <SegmentStart startedAt={model.startedAt} />
      ) : null}
      {items.map((item, index) => (
        <Item
          key={item.key}
          item={item}
          isLast={index === items.length - 1}
          model={model}
          onOpenMemory={onOpenMemory}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}

const styles = stylex.create({
  log: {
    flexGrow: 1,
    minBlockSize: 0,
  },
  centred: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._8,
  },
  centredText: {
    alignItems: "center",
    textAlign: "center",
  },
  empty: {
    paddingBlock: space._3,
  },
  start: {
    paddingBlockEnd: space._1,
  },
  startText: {
    flexShrink: 0,
  },
  rule: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: space._4,
  },
  member: {
    alignSelf: "flex-end",
    maxInlineSize: "85%",
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.muted,
  },
  quiet: {
    color: color.mutedForeground,
  },
  doneCard: {
    opacity: 0.7,
  },
  cardFoot: {
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  options: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.tight,
  },
});
