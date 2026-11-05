"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { TabViewLink } from "@tuja/ui/components/tab-view";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { plainList, truncate } from "@tuja/ui/primitives/layout.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
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
  const listRef = useRef<HTMLOListElement>(null);
  useMonthSlide(listRef, view.month, 24);
  const one = t({ en: "transaction", zh: "笔交易" });
  const many = t({ en: "transactions", zh: "笔交易" });
  const from = fromEpochDay(view.firstDay);
  const to = fromEpochDay(view.firstDay + view.days.length - 1);

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <Heading level={2} look="h4" id={headingId} css={styles.heading}>
        {t({ en: "Top payees", zh: "主要商家" })}
      </Heading>
      {view.payees.length === 0 ? (
        <p css={[typeRole.bodySmall, styles.muted, styles.empty]}>
          {t({ en: "No payees this month.", zh: "本月没有商家记录。" })}
        </p>
      ) : (
        <ol ref={listRef} css={[plainList.list, stack.text]}>
          {view.payees.map((payee) => {
            const name = names.payee(payee.payeeId);
            const emoji =
              payee.categoryId === null
                ? ""
                : names.category(payee.categoryId).emoji;
            return (
              <li key={payee.payeeId}>
                <TabViewLink
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
                  {...stylex.props(
                    corner.radius_3,
                    quietSurface.interactive,
                    styles.row,
                  )}
                >
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
                  <span css={[stack.text, styles.text]}>
                    <span css={[typeRole.body, truncate.base, styles.name]}>
                      {name}
                    </span>
                    <span
                      css={[
                        typeRole.caption,
                        typeModifier.numeric,
                        styles.muted,
                      ]}
                    >
                      {`${payee.count.toLocaleString(locale)} ${
                        payee.count === 1 ? one : many
                      }`}
                    </span>
                  </span>
                  <span
                    css={[typeRole.body, typeModifier.numeric, styles.amount]}
                  >
                    {wholeMoney(payee.value, currency, locale, "auto")}
                  </span>
                </TabViewLink>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
  },
  empty: {
    margin: 0,
  },
  muted: {
    color: color.fgMuted,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    paddingBlock: space._1,
    paddingInline: space._1,
    marginInline: `calc(-1 * ${space._1})`,
  },
  tile: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "2.75rem",
    blockSize: "2.75rem",
    color: color.fg,
    fontWeight: font.weight_7,
  },
  text: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  name: {
    fontWeight: font.weight_5,
  },
  amount: {
    flexShrink: 0,
    fontWeight: font.weight_6,
  },
});
