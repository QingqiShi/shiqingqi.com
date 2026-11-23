"use client";

import { NotebookIcon } from "@phosphor-icons/react/dist/ssr/Notebook";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { FilterChips } from "@tuja/ui/components/filter-chips";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { Fragment, useState } from "react";
import type { JournalEntryView } from "../views/load-journal.ts";
import { displayDate } from "./display-date.ts";
import { JournalKindBadge } from "./journal-kind-badge.tsx";
import { MarkdownText } from "./markdown-text.tsx";

const ALL = "*all";
const FUND = "*fund";

function EntrySummary({ entry }: { entry: JournalEntryView }) {
  return (
    <span css={stack.text}>
      <span css={cluster.inline}>
        <JournalKindBadge kind={entry.kind} />
        {entry.symbol === null ? null : (
          <Text as="span" look="body" weight="semibold">
            {entry.symbol}
            {entry.name === null ? null : (
              <Text as="span" look="caption" tone="muted">
                {`  ${entry.name}`}
              </Text>
            )}
          </Text>
        )}
      </span>
      <Text as="span" look="bodySmall" tone="muted" verbatim>
        {entry.summary}
      </Text>
    </span>
  );
}

function EntryDisclosure({ entry }: { entry: JournalEntryView }) {
  const locale = useLocale();
  return (
    <Disclosure summary={<EntrySummary entry={entry} />}>
      <div css={stack.item}>
        <MarkdownText>{entry.rationale}</MarkdownText>
        {entry.runId === null ? null : (
          <div>
            <Button
              href={getLocalePath(`/journal/${entry.runId}`, locale)}
              look="ghost"
              size="sm"
              icon={<NotebookIcon weight="bold" />}
            >
              {t({ en: "Minutes", zh: "会议纪要" })}
            </Button>
          </div>
        )}
      </div>
    </Disclosure>
  );
}

function DayGroup({
  date,
  entries,
}: {
  date: string;
  entries: readonly JournalEntryView[];
}) {
  const locale = useLocale();
  return (
    <Section level={3} title={displayDate(date, locale, "weekday")}>
      <Card>
        <div css={stack.tight}>
          {entries.map((entry, index) => (
            <Fragment key={entry.id}>
              {index > 0 ? <Divider /> : null}
              <EntryDisclosure entry={entry} />
            </Fragment>
          ))}
        </div>
      </Card>
    </Section>
  );
}

/**
 * The trade journal, newest day first, with a filter by stock. Entries that
 * are about the fund as a whole, such as a new fund thesis, have their own chip.
 */
export function JournalEntries({
  entries,
}: {
  entries: readonly JournalEntryView[];
}) {
  const [filter, setFilter] = useState(ALL);
  const symbols = [
    ...new Set(
      entries.flatMap((entry) => (entry.symbol === null ? [] : [entry.symbol])),
    ),
  ].sort();
  const fundCount = entries.filter((entry) => entry.symbol === null).length;
  const options = [
    { value: ALL, label: t({ en: "All", zh: "全部" }), count: entries.length },
    ...(fundCount === 0
      ? []
      : [
          {
            value: FUND,
            label: t({ en: "The fund", zh: "基金整体" }),
            count: fundCount,
          },
        ]),
    ...symbols.map((symbol) => ({
      value: symbol,
      label: symbol,
      count: entries.filter((entry) => entry.symbol === symbol).length,
    })),
  ];
  const shown = entries.filter((entry) =>
    filter === ALL
      ? true
      : filter === FUND
        ? entry.symbol === null
        : entry.symbol === filter,
  );
  const days = Map.groupBy(shown, (entry) => entry.date);

  return (
    <div css={stack.group}>
      <FilterChips
        aria-label={t({ en: "Show entries for", zh: "显示哪些记录" })}
        options={options}
        value={filter}
        onChange={setFilter}
        scrollButtons={{
          startLabel: t({ en: "Earlier chips", zh: "前面的筛选项" }),
          endLabel: t({ en: "More chips", zh: "更多筛选项" }),
        }}
      />
      {[...days].map(([date, dayEntries]) => (
        <DayGroup key={date} date={date} entries={dayEntries} />
      ))}
    </div>
  );
}
