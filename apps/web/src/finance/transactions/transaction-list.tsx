"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps, Ref } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { CategoryRow, EntryRow } from "../sync/row-schemas.ts";
import type { TransactionListItem } from "./build-transaction-list.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import {
  TransactionListRow,
  type TransactionRowActions,
} from "./transaction-list-row.tsx";

interface TransactionListProps {
  items: readonly TransactionListItem[];
  lookups: TransactionLookups;
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>;
  tagIdsByTransaction: ReadonlyMap<string, readonly string[]>;
  pendingKeys: ReadonlySet<string>;
  baseCurrency: string;
  locale: string;
  today: string;
  onToggleUpcoming: () => void;
  selectedId: string | null;
  reviewMode: boolean;
  categoriesByKind: {
    expense: readonly CategoryRow[];
    income: readonly CategoryRow[];
  };
  actions: TransactionRowActions;
  listLabel: string;
  virtuosoRef?: Ref<VirtuosoHandle>;
}

const NO_ENTRIES: readonly EntryRow[] = [];
const NO_TAGS: readonly string[] = [];

function List({
  context,
  ...props
}: ComponentProps<"div"> & { context?: { label: string } }) {
  return <div {...props} role="list" aria-label={context?.label} />;
}

function Item(
  props: ComponentProps<"div"> & { item?: unknown; context?: unknown },
) {
  const { item: _item, context: _context, ...rest } = props;
  return <div {...rest} role="listitem" />;
}

function DayHeader({
  day,
  today,
  expenseMinor,
  incomeMinor,
  baseCurrency,
  locale,
}: {
  day: string;
  today: string;
  expenseMinor: number;
  incomeMinor: number;
  baseCurrency: string;
  locale: string;
}) {
  const todayLabel = t({ en: "Today", zh: "今天" });
  const spentLabel = t({ en: "spent", zh: "支出" });
  const receivedLabel = t({ en: "received", zh: "收入" });
  const label =
    day === today
      ? `${todayLabel} · ${displayDay(day, locale, "weekday")}`
      : displayDay(
          day,
          locale,
          day.slice(0, 4) === today.slice(0, 4) ? "weekday" : "weekdayYear",
        );
  return (
    <div css={[flex.between, styles.day]}>
      <h3 css={[typeRole.label, styles.dayLabel]}>{label}</h3>
      <span
        css={[flex.row, typeRole.caption, typeModifier.numeric, styles.totals]}
      >
        {expenseMinor !== 0 ? (
          <span>
            <span css={a11y.srOnly}>{`${spentLabel} `}</span>
            {formatMoney(expenseMinor, baseCurrency, locale, {
              signDisplay: "exceptZero",
            })}
          </span>
        ) : null}
        {incomeMinor !== 0 ? (
          <span>
            <span css={a11y.srOnly}>{`${receivedLabel} `}</span>
            {formatMoney(incomeMinor, baseCurrency, locale, {
              signDisplay: "exceptZero",
            })}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function UpcomingHeader({
  count,
  totalMinor,
  open,
  baseCurrency,
  locale,
  onToggle,
}: {
  count: number;
  totalMinor: number;
  open: boolean;
  baseCurrency: string;
  locale: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      css={[buttonReset.base, flex.between, corner.radius_3, styles.upcoming]}
    >
      <span css={[flex.row, typeRole.label, styles.upcomingLabel]}>
        {open ? (
          <CaretDownIcon weight="bold" aria-hidden />
        ) : (
          <CaretRightIcon weight="bold" aria-hidden />
        )}
        {`${t({ en: "Coming up", zh: "即将到期" })} (${String(count)})`}
      </span>
      {totalMinor !== 0 ? (
        <span css={[typeRole.caption, typeModifier.numeric, styles.totals]}>
          {formatMoney(totalMinor, baseCurrency, locale, {
            signDisplay: "exceptZero",
          })}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The day-grouped list: a header per day with its spending and income, then
 * the day's Transactions. Only the rows on screen are in the DOM, so it stays
 * smooth with tens of thousands of rows.
 */
export function TransactionList({
  items,
  lookups,
  entriesByTransaction,
  tagIdsByTransaction,
  pendingKeys,
  baseCurrency,
  locale,
  today,
  onToggleUpcoming,
  selectedId,
  reviewMode,
  categoriesByKind,
  actions,
  listLabel,
  virtuosoRef,
}: TransactionListProps) {
  return (
    <Virtuoso
      ref={virtuosoRef}
      context={{ label: listLabel }}
      data={items}
      useWindowScroll
      increaseViewportBy={{ top: 400, bottom: 800 }}
      components={{ List, Item }}
      computeItemKey={(_, item) =>
        item.type === "day"
          ? `day:${item.day}`
          : item.type === "upcoming"
            ? "upcoming"
            : item.row.id
      }
      itemContent={(_, item) =>
        item.type === "upcoming" ? (
          <UpcomingHeader
            count={item.count}
            totalMinor={item.totalMinor}
            open={item.open}
            baseCurrency={baseCurrency}
            locale={locale}
            onToggle={onToggleUpcoming}
          />
        ) : item.type === "day" ? (
          <DayHeader
            day={item.day}
            today={today}
            expenseMinor={item.expenseMinor}
            incomeMinor={item.incomeMinor}
            baseCurrency={baseCurrency}
            locale={locale}
          />
        ) : (
          <TransactionListRow
            row={item.row}
            entries={entriesByTransaction.get(item.row.id) ?? NO_ENTRIES}
            tagIds={tagIdsByTransaction.get(item.row.id) ?? NO_TAGS}
            lookups={lookups}
            baseCurrency={baseCurrency}
            locale={locale}
            today={today}
            isSelected={item.row.id === selectedId}
            isPending={pendingKeys.has(`transactions:${item.row.id}`)}
            reviewMode={reviewMode}
            categoriesOfKind={
              item.row.kind === "income"
                ? categoriesByKind.income
                : categoriesByKind.expense
            }
            actions={actions}
          />
        )
      }
    />
  );
}

const styles = stylex.create({
  day: {
    gap: rhythm.tight,
    paddingBlockStart: space._3,
    paddingBlockEnd: space._1,
    paddingInline: space._2,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  dayLabel: {
    fontWeight: font.weight_6,
  },
  totals: {
    gap: rhythm.item,
    color: color.fgMuted,
  },
  upcoming: {
    inlineSize: "100%",
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._2,
    backgroundColor: {
      default: color.bgSurfaceSunken,
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  upcomingLabel: {
    gap: rhythm.inline,
    fontWeight: font.weight_6,
  },
});
