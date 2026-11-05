"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { TabViewLink } from "@tuja/ui/components/tab-view";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { animate } from "@tuja/ui/primitives/motion.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { AnalyticsIndex } from "../analytics/types.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { financeHref } from "../navigation/finance-href.ts";
import { useReplica } from "../replica/use-replica.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import { TransactionFace } from "../transactions/transaction-face.tsx";
import { useDescribeTransaction } from "../transactions/use-describe-transaction.ts";
import { useTransactionLookups } from "../transactions/use-transaction-lookups.ts";
import { largestFirst, type MonthDay } from "./build-month-view.ts";

interface MonthDayDetailProps {
  day: MonthDay | null;
  index: AnalyticsIndex;
  currency: string;
}

const NO_ENTRIES: never[] = [];

/** The most Transactions a day lists here; the rest are in Activity. */
const MAX_ROWS = 6;

/**
 * The largest Transactions of the picked day, each a link to itself, and a
 * link to the whole day in Activity when it has more; a hint when no day is
 * picked.
 */
export function MonthDayDetail({ day, index, currency }: MonthDayDetailProps) {
  const locale = useLocale();
  const transactions = useReplica((snapshot) => snapshot.tables.transactions);
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const tagIdsByTransaction = useReplica(selectTagIdsByTransaction);
  const lookups = useTransactionLookups();
  const describe = useDescribeTransaction(lookups);
  const nothing = t({
    en: "Nothing recorded on this day.",
    zh: "这一天没有记录。",
  });
  const hint = t({
    en: "Pick a day to see what came in and went out.",
    zh: "选择一天，查看当天的收支。",
  });

  if (day === null) {
    return <p css={[typeRole.bodySmall, styles.muted, styles.hint]}>{hint}</p>;
  }

  const shownRows = day.rows.toSorted(largestFirst(index)).slice(0, MAX_ROWS);
  const hiddenCount = day.rows.length - shownRows.length;
  const dayKey = fromEpochDay(day.epochDay);
  const spent = day.rows.reduce(
    (sum, row) => (index.kinds[row] === 0 ? sum - index.amounts[row] : sum),
    0,
  );

  return (
    <div key={day.epochDay} css={[stack.tight, animate.fadeIn]}>
      <div css={styles.header}>
        <h3 css={[typeRole.label, styles.heading]}>
          {displayDay(day.epochDay, locale, "weekday")}
        </h3>
        {spent === 0 ? null : (
          <span css={[typeRole.caption, typeModifier.numeric, styles.muted]}>
            {formatMoney(-Math.round(spent), currency, locale, {
              signDisplay: "exceptZero",
            })}
          </span>
        )}
      </div>
      {day.rows.length === 0 ? (
        <p css={[typeRole.bodySmall, styles.muted, styles.hint]}>{nothing}</p>
      ) : (
        <ul css={[plainList.list, stack.text]}>
          {shownRows.map((row) => {
            const id = index.transactionIds[row];
            const transaction = transactions.get(id);
            if (!transaction) return null;
            const description = describe(transaction, {
              entries: entriesByTransaction.get(id) ?? NO_ENTRIES,
              tagIds: tagIdsByTransaction.get(id) ?? NO_ENTRIES,
              accountId: null,
            });
            return (
              <li key={id}>
                <TabViewLink
                  href={financeHref({ screen: "transactions", id }, locale)}
                  {...stylex.props(
                    corner.radius_3,
                    quietSurface.interactive,
                    styles.link,
                  )}
                >
                  <TransactionFace
                    icon={description.icon}
                    title={description.title}
                    subtitle={description.subtitle}
                    amount={formatMoney(
                      Math.round(index.amounts[row]),
                      currency,
                      locale,
                      { signDisplay: "exceptZero" },
                    )}
                  />
                </TabViewLink>
              </li>
            );
          })}
          {hiddenCount > 0 ? (
            <li>
              <TabViewLink
                href={financeHref(
                  {
                    screen: "transactions",
                    filters: { from: dayKey, to: dayKey },
                  },
                  locale,
                )}
                {...stylex.props(
                  flex.between,
                  typeRole.bodySmall,
                  corner.radius_3,
                  quietSurface.interactive,
                  styles.more,
                )}
              >
                {t({
                  en: "See all in Activity",
                  zh: "在交易中查看全部",
                })}
                <span css={[flex.row, typeModifier.numeric, styles.moreCount]}>
                  {`+${hiddenCount.toLocaleString(locale)}`}
                  <CaretRightIcon weight="bold" aria-hidden />
                </span>
              </TabViewLink>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: rhythm.item,
    paddingInline: space._2,
  },
  heading: {
    margin: 0,
    fontWeight: font.weight_6,
  },
  hint: {
    margin: 0,
    paddingInline: space._2,
  },
  muted: {
    color: color.fgMuted,
  },
  link: {
    display: "block",
    paddingInline: space._2,
  },
  more: {
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: `calc(2 * ${space._2})`,
    color: color.fgMuted,
  },
  moreCount: {
    gap: rhythm.tight,
  },
});
