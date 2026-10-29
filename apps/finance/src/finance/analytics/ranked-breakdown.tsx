"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState } from "react";
import { financeHref } from "../navigation/finance-href.ts";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import { formatAnalyticsMoney } from "./format-analytics-money.ts";
import { RankedRow } from "./ranked-row.tsx";
import { transactionsBehind } from "./transactions-behind.ts";
import { useScopeLabel } from "./use-scope-label.ts";

const COLLAPSED_ROWS = 10;

interface RankedItem {
  key: string;
  label: string;
  value: number;
  filter: { payeeId: string } | { tagId: string };
}

/** Money per Payee or Tag in the range, largest first. Each row opens its Transactions. */
export function RankedBreakdown({
  heading,
  empty,
  list: List,
  items,
  state,
  view,
  currency,
}: {
  heading: string;
  empty: string;
  list: "ol" | "ul";
  items: readonly RankedItem[];
  state: AnalyticsState;
  view: AnalyticsView;
  currency: string;
}) {
  const locale = useLocale();
  const headingId = useId();
  const scope = useScopeLabel(view);
  const inLabel = t({ en: "In ", zh: "范围：" });
  const largest = items.reduce(
    (most, item) => Math.max(most, Math.abs(item.value)),
    0,
  );
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, COLLAPSED_ROWS);

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <div css={stack.text}>
        <Heading level={2} look="h4" id={headingId} css={styles.heading}>
          {heading}
        </Heading>
        {scope === null ? null : (
          <Text look="caption" tone="muted">
            {`${inLabel}${scope}`}
          </Text>
        )}
      </div>
      {items.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {empty}
        </Text>
      ) : (
        <List {...stylex.props(stack.rows, plainList.list)}>
          {shown.map((item) => (
            <RankedRow
              key={item.key}
              label={item.label}
              value={formatAnalyticsMoney(
                item.value,
                currency,
                locale,
                state.kind,
              )}
              magnitude={largest === 0 ? 0 : Math.abs(item.value) / largest}
              href={financeHref(
                transactionsBehind({
                  from: view.range.from,
                  to: view.range.to,
                  kind: state.kind,
                  member: state.member,
                  ...item.filter,
                }),
                locale,
              )}
            />
          ))}
        </List>
      )}
      {items.length > COLLAPSED_ROWS ? (
        <div>
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              setShowAll(!showAll);
            }}
          >
            {showAll
              ? t({ en: "Show fewer", zh: "收起" })
              : `${t({ en: "Show all", zh: "显示全部" })} (${String(items.length)})`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
  },
});
