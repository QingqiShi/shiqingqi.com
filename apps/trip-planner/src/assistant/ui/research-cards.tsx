"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Anchor } from "@tuja/ui/components/anchor";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Select } from "@tuja/ui/components/select";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type {
  CardAction,
  CardView,
  DayChoice,
  TranscriptItem,
} from "#src/assistant/assistant-api.ts";
import { useNewTabLabel } from "#src/reader/use-new-tab-label.ts";
import type { TripAssistantModel } from "./use-trip-assistant.ts";

type CardsItem = Extract<TranscriptItem, { type: "cards" }>;

const CARD_ACTIONS = ["add", "backup"] as const satisfies readonly CardAction[];

function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function useReadAt(readAt: string): string {
  const locale = useLocale();
  const read = new Date(readAt);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(
    read,
  );
  const [today] = useState(() => new Date().toDateString());
  const isToday = read.toDateString() === today;
  const day = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(read);
  return isToday
    ? t({ en: "read today {time}", zh: "今天 {time} 读取" }).replace(
        "{time}",
        time,
      )
    : t({ en: "read {day} {time}", zh: "{day} {time} 读取" })
        .replace("{day}", day)
        .replace("{time}", time);
}

function useActionWords() {
  return {
    add: t({ en: "Added to day {day}", zh: "已加入第 {day} 天" }),
    backup: t({
      en: "Saved as a backup on day {day}",
      zh: "已存为第 {day} 天的备选",
    }),
  } satisfies Record<CardAction, string>;
}

function ResearchCard({
  changeId,
  card,
  model,
  days,
}: {
  changeId: string;
  card: CardView;
  model: TripAssistantModel | null;
  days: readonly DayChoice[];
}) {
  const newTabLabel = useNewTabLabel();
  const readAt = useReadAt(card.readAt);
  const actionWords = useActionWords();
  const [dayId, setDayId] = useState(card.dayId ?? days.at(0)?.id ?? "");
  const numberOf = (id: string) =>
    String(days.find((day) => day.id === id)?.number ?? "?");
  const undoWord = t({ en: "Undo", zh: "撤销" });
  const dayWord = t({ en: "Day {n}", zh: "第 {n} 天" });
  const done = CARD_ACTIONS.flatMap((action) => {
    const view = card.actions[action];
    return view && view.status !== "undone" ? [{ action, view }] : [];
  });
  const isTapping = model?.deciding === `${changeId}:${card.id}`;
  const isWaiting =
    model !== null && (model.isRunning || model.deciding !== null);
  const dayNumber = numberOf(dayId);

  return (
    <Card padding="sm" css={stack.tight}>
      <div css={stack.text}>
        <Text as="p" weight="semibold" verbatim>
          {card.name}
        </Text>
        {card.area === "" ? null : (
          <Text as="p" look="caption" tone="muted" verbatim>
            {card.area}
          </Text>
        )}
      </div>
      <Text as="p" look="bodySmall" verbatim>
        {t({ en: "“{quote}”", zh: "“{quote}”" }).replace("{quote}", card.quote)}
      </Text>
      <div css={[row.tight, styles.wrap]}>
        <Anchor
          href={card.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          newTabLabel={newTabLabel}
          tone="muted"
        >
          {siteOf(card.url)}
        </Anchor>
        <Text as="span" look="caption" tone="muted">
          {readAt}
        </Text>
      </div>
      {card.bookingUrl ? (
        <div>
          <Anchor
            href={card.bookingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            newTabLabel={newTabLabel}
            standalone
          >
            {t({
              en: "Stays in this area on Booking.com, for your dates",
              zh: "Booking.com 上这一带的住处（按你的日期）",
            })}
          </Anchor>
        </div>
      ) : null}
      {done.map(({ action, view }) => (
        <div key={action} css={[row.tight, styles.foot]}>
          <Text as="span" look="caption" tone="muted">
            {actionWords[action].replace("{day}", numberOf(view.dayId))}
          </Text>
          {model && view.canUndo ? (
            <Button
              size="sm"
              look="outline"
              icon={<ArrowCounterClockwiseIcon weight="bold" />}
              disabled={isWaiting}
              loading={model.deciding === view.changeId}
              onClick={() => {
                void model.decide(view.changeId, "undo");
              }}
            >
              {undoWord}
            </Button>
          ) : null}
        </div>
      ))}
      {model && done.length === 0 && days.length > 0 ? (
        <div css={[row.tight, styles.wrap]}>
          <Select
            size="sm"
            label={t({ en: "Day", zh: "哪一天" })}
            labelHidden
            value={dayId}
            onChange={(event) => {
              setDayId(event.target.value);
            }}
            options={days.map((day) => ({
              value: day.id,
              label: dayWord.replace("{n}", String(day.number)),
            }))}
            css={styles.day}
          />
          <Button
            size="sm"
            look="primary"
            disabled={isWaiting && !isTapping}
            loading={isTapping}
            onClick={() => {
              void model.cardAction(changeId, card.id, "add", dayId);
            }}
          >
            {t({ en: "Add to day {n}", zh: "加入第 {n} 天" }).replace(
              "{n}",
              dayNumber,
            )}
          </Button>
          <Button
            size="sm"
            look="outline"
            disabled={isWaiting}
            onClick={() => {
              void model.cardAction(changeId, card.id, "backup", dayId);
            }}
          >
            {t({ en: "Save as backup", zh: "存为备选" })}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

/** The cards of one `show_cards` call. */
export function ResearchCards({
  item,
  model,
}: {
  item: CardsItem;
  /** Null where the conversation only reads. */
  model: TripAssistantModel | null;
}) {
  return (
    <div css={stack.tight}>
      {item.cards.map((card) => (
        <ResearchCard
          key={card.id}
          changeId={item.changeId}
          card={card}
          model={model}
          days={model?.days ?? []}
        />
      ))}
    </div>
  );
}

/** The line while the research sub-agent reads the web. */
export function SearchingLine() {
  return (
    <div css={row.tight}>
      <Spinner size="inline" aria-hidden />
      <Text as="p" look="caption" tone="muted">
        {t({
          en: "Searching the web… this can take up to a minute.",
          zh: "正在联网查找……可能要一分钟左右。",
        })}
      </Text>
    </div>
  );
}

const styles = stylex.create({
  wrap: {
    flexWrap: "wrap",
  },
  foot: {
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  day: {
    inlineSize: "auto",
  },
});
