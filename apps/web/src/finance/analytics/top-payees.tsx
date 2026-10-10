"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId } from "react";
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

/** The ten Payees with the most money in the range; each opens its Transactions. */
export function TopPayees({
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
  const largest = view.payees.reduce(
    (most, item) => Math.max(most, Math.abs(item.value)),
    0,
  );
  const signed = state.kind === "net";

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <div css={stack.tight}>
        <Heading level={2} look="h4" id={headingId} css={styles.heading}>
          {t({ en: "Top payees", zh: "主要商家" })}
        </Heading>
        {scope === null ? null : (
          <Text look="caption" tone="muted">
            {`${inLabel}${scope}`}
          </Text>
        )}
      </div>
      {view.payees.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({ en: "No payees in this range.", zh: "这段时间没有商家记录。" })}
        </Text>
      ) : (
        <ol css={[stack.tight, styles.list]}>
          {view.payees.map((item) => (
            <RankedRow
              key={item.payeeId}
              label={names.payee(item.payeeId)}
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
                  payeeId: item.payeeId,
                }),
                locale,
              )}
            />
          ))}
        </ol>
      )}
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
