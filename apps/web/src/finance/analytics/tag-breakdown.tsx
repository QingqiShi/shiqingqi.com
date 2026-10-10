"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import { RankedRow } from "./ranked-row.tsx";
import { transactionsHref } from "./transactions-href.ts";
import { useAnalyticsNames } from "./use-analytics-names.ts";
import { useScopeLabel } from "./use-scope-label.ts";

const TAG_ROWS = 10;

/** Money per Tag in the range; a Transaction with two Tags counts in both. Each opens its Transactions. */
export function TagBreakdown({
  state,
  view,
  currency,
}: {
  state: AnalyticsState;
  view: AnalyticsView;
  currency: string;
}) {
  const locale = useLocale();
  const names = useAnalyticsNames();
  const headingId = useId();
  const scope = useScopeLabel(view);
  const inLabel = t({ en: "In ", zh: "范围：" });
  const largest = view.tags.reduce(
    (most, item) => Math.max(most, Math.abs(item.value)),
    0,
  );
  const signed = state.kind === "net";
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? view.tags : view.tags.slice(0, TAG_ROWS);

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <div css={stack.tight}>
        <Heading level={2} look="h4" id={headingId} css={styles.heading}>
          {t({ en: "By tag", zh: "按标签" })}
        </Heading>
        {scope === null ? null : (
          <Text look="caption" tone="muted">
            {`${inLabel}${scope}`}
          </Text>
        )}
      </div>
      {view.tags.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "No tagged transactions in this range.",
            zh: "这段时间没有带标签的交易。",
          })}
        </Text>
      ) : (
        <ul css={[stack.tight, styles.list]}>
          {shown.map((item) => (
            <RankedRow
              key={item.tagId}
              label={`#${names.tag(item.tagId)}`}
              value={formatMoney(Math.round(item.value), currency, locale, {
                signDisplay: signed ? "exceptZero" : "auto",
              })}
              magnitude={largest === 0 ? 0 : Math.abs(item.value) / largest}
              href={getLocalePath(
                transactionsHref({
                  from: view.range.from,
                  to: view.range.to,
                  kind: state.kind,
                  member: state.member,
                  tagId: item.tagId,
                }),
                locale,
              )}
            />
          ))}
        </ul>
      )}
      {view.tags.length > TAG_ROWS ? (
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
              : `${t({ en: "Show all", zh: "显示全部" })} (${String(view.tags.length)})`}
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
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});
