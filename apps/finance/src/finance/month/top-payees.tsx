"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { TabViewLink } from "@tuja/ui/components/tab-view";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import { useId, useRef } from "react";
import { transactionsBehind } from "../analytics/transactions-behind.ts";
import { useAnalyticsNames } from "../analytics/use-analytics-names.ts";
import { seriesTint } from "../charts/series-marks.stylex.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { financeHref } from "../navigation/finance-href.ts";
import type { MonthView } from "./build-month-view.ts";
import { useMonthSlide } from "./use-month-slide.ts";
import { wholeMoney } from "./whole-money.ts";

/** The first letter of each of the first two words: "Tesco Express" is "TE". */
function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Where most of the month's money went: each Payee on a tile in the colour
 * of its main Category, with its Category's emoji or its initials, how many
 * Transactions it has, and the total. A row opens those Transactions.
 */
export function TopPayees({
  view,
  currency,
}: {
  view: MonthView;
  currency: string;
}) {
  const locale = useLocale();
  const names = useAnalyticsNames();
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  useMonthSlide(listRef, view.month, 24);
  const one = t({ en: "transaction", zh: "笔交易" });
  const many = t({ en: "transactions", zh: "笔交易" });
  const from = fromEpochDay(view.firstDay);
  const to = fromEpochDay(view.firstDay + view.days.length - 1);

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <Heading level={2} look="h4" id={headingId}>
        {t({ en: "Top payees", zh: "主要商家" })}
      </Heading>
      {view.payees.length === 0 ? (
        <Text look="bodySmall" tone="muted" measure="none">
          {t({ en: "No payees this month.", zh: "本月没有商家记录。" })}
        </Text>
      ) : (
        <List ref={listRef} form="plain">
          {view.payees.map((payee) => {
            const name = names.payee(payee.payeeId);
            const emoji =
              payee.categoryId === null
                ? ""
                : names.category(payee.categoryId).emoji;
            return (
              <ListRow
                key={payee.payeeId}
                href={financeHref(
                  transactionsBehind({
                    from,
                    to,
                    kind: "spending",
                    member: null,
                    payeeId: payee.payeeId,
                  }),
                  locale,
                )}
                linkComponent={TabViewLink}
                caret={false}
                leading={
                  <span
                    aria-hidden
                    css={[
                      corner.radius_2,
                      emoji ? typeRole.h3 : typeRole.label,
                      styles.tile,
                      seriesTint[payee.tone],
                    ]}
                  >
                    {emoji || initialsOf(name)}
                  </span>
                }
                leadingSize="lg"
                detail={`${payee.count.toLocaleString(locale)} ${
                  payee.count === 1 ? one : many
                }`}
                value={wholeMoney(payee.value, currency, locale, "auto")}
              >
                {name}
              </ListRow>
            );
          })}
        </List>
      )}
    </section>
  );
}

const styles = stylex.create({
  tile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
    fontWeight: font.weight_7,
    color: color.foreground,
  },
});
