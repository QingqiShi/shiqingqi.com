"use client";

import { FunnelSimpleIcon } from "@phosphor-icons/react/dist/ssr/FunnelSimple";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Chip } from "@tuja/ui/components/chip";
import { chipSize, chipSurface } from "@tuja/ui/components/chip.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useId, useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import {
  endOfMonth,
  startOfMonth,
  startOfYear,
} from "../domain/dates/start-of-month.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type {
  AccountGroupRow,
  AccountRow,
  CategoryRow,
  MemberRow,
} from "../sync/row-schemas.ts";
import { DayInput } from "./day-input.tsx";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import {
  EMPTY_TRANSACTION_FILTERS,
  transactionFilters,
  type TransactionFilters,
  type TransactionKind,
} from "./transaction-filters.ts";

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  reviewCount: number;
  expectedCount: number;
  members: readonly MemberRow[];
  accounts: readonly AccountRow[];
  accountGroups: readonly AccountGroupRow[];
  categories: readonly CategoryRow[];
  lookups: TransactionLookups;
  today: string;
}

type RangeKey =
  "any" | "thisMonth" | "lastMonth" | "threeMonths" | "thisYear" | "custom";

function rangeOf(key: RangeKey, today: string) {
  const month = startOfMonth(today);
  switch (key) {
    case "thisMonth": {
      return { from: month, to: endOfMonth(today) };
    }
    case "lastMonth": {
      const last = addMonths(month, -1);
      return { from: last, to: endOfMonth(last) };
    }
    case "threeMonths": {
      return { from: addMonths(month, -2), to: endOfMonth(today) };
    }
    case "thisYear": {
      return { from: startOfYear(today), to: `${today.slice(0, 4)}-12-31` };
    }
    case "any":
    case "custom": {
      return { from: null, to: null };
    }
  }
}

const PRESETS = ["thisMonth", "lastMonth", "threeMonths", "thisYear"] as const;

function FilterSelect({
  label,
  value,
  isActive,
  onChange,
  children,
}: {
  label: string;
  value: string;
  isActive: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} css={a11y.srOnly}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        css={[
          typeRole.caption,
          chipSurface.base,
          chipSize.sm,
          chipSurface.interactive,
          isActive && chipSurface.active,
          styles.select,
        ]}
      >
        {children}
      </select>
    </>
  );
}

/**
 * The filter chips above the list: Review, Expected, each Member, kind,
 * account, Category and date range, plus removable chips for a Payee or Tag
 * that a link from another screen set.
 */
export function TransactionFilterBar({
  filters,
  onChange,
  reviewCount,
  expectedCount,
  members,
  accounts,
  accountGroups,
  categories,
  lookups,
  today,
}: TransactionFilterBarProps) {
  const set = (fields: Partial<TransactionFilters>) => {
    onChange({ ...filters, ...fields });
  };
  const removeLabel = t({ en: "Remove filter", zh: "移除筛选" });
  const range: RangeKey =
    filters.from === null && filters.to === null
      ? "any"
      : (PRESETS.find((key) => {
          const preset = rangeOf(key, today);
          return preset.from === filters.from && preset.to === filters.to;
        }) ?? "custom");

  const [moreOpen, setMoreOpen] = useState(false);
  const activeCount =
    (filters.memberIds.length > 0 ? 1 : 0) +
    (filters.kinds.length > 0 ? 1 : 0) +
    (filters.accountIds.length > 0 ? 1 : 0) +
    (filters.categoryIds.length > 0 ? 1 : 0) +
    (range === "any" ? 0 : 1) +
    filters.payeeIds.length +
    filters.tagIds.length;
  const moreId = useId();

  const categoryName = useCategoryDisplayName();
  const parents = categories.filter((category) => category.parentId === null);
  const childrenOf = (id: string) =>
    categories.filter((category) => category.parentId === id);

  return (
    <div
      role="group"
      aria-label={t({ en: "Filters", zh: "筛选" })}
      css={[cluster.tight, styles.bar]}
    >
      {reviewCount > 0 || filters.review ? (
        <Chip
          size="sm"
          isActive={filters.review}
          onClick={() => {
            set({ review: !filters.review });
          }}
        >
          {`${t({ en: "Review", zh: "待审核" })} (${String(reviewCount)})`}
        </Chip>
      ) : null}
      {expectedCount > 0 || filters.expected ? (
        <Chip
          size="sm"
          isActive={filters.expected}
          onClick={() => {
            set({ expected: !filters.expected });
          }}
        >
          {`${t({ en: "Expected", zh: "待确认" })} (${String(expectedCount)})`}
        </Chip>
      ) : null}
      <span css={styles.narrowOnly}>
        <Chip
          size="sm"
          icon={<FunnelSimpleIcon weight="bold" />}
          aria-expanded={moreOpen}
          aria-controls={moreId}
          trailing={
            activeCount > 0 ? (
              <Badge intent="accent" size="sm">
                {String(activeCount)}
              </Badge>
            ) : undefined
          }
          onClick={() => {
            setMoreOpen(!moreOpen);
          }}
        >
          {t({ en: "Filter", zh: "筛选" })}
        </Chip>
      </span>
      <div id={moreId} css={[styles.more, !moreOpen && styles.collapsed]}>
        {members.length > 1
          ? members.map((member) => {
              const active = filters.memberIds.includes(member.id);
              return (
                <Chip
                  key={member.id}
                  size="sm"
                  isActive={active}
                  onClick={() => {
                    set({
                      memberIds: active
                        ? filters.memberIds.filter((id) => id !== member.id)
                        : [...filters.memberIds, member.id],
                    });
                  }}
                >
                  {member.name}
                </Chip>
              );
            })
          : null}
        <FilterSelect
          label={t({ en: "Kind", zh: "类型" })}
          value={filters.kinds.length === 1 ? filters.kinds[0] : ""}
          isActive={filters.kinds.length > 0}
          onChange={(value) => {
            set({
              kinds:
                value === "expense" ||
                value === "income" ||
                value === "transfer"
                  ? [value satisfies TransactionKind]
                  : [],
            });
          }}
        >
          <option value="">{t({ en: "Any kind", zh: "全部类型" })}</option>
          <option value="expense">{t({ en: "Expenses", zh: "支出" })}</option>
          <option value="income">{t({ en: "Income", zh: "收入" })}</option>
          <option value="transfer">{t({ en: "Transfers", zh: "转账" })}</option>
        </FilterSelect>
        <FilterSelect
          label={t({ en: "Account", zh: "账户" })}
          value={filters.accountIds.length === 1 ? filters.accountIds[0] : ""}
          isActive={filters.accountIds.length > 0}
          onChange={(value) => {
            set({ accountIds: value === "" ? [] : [value] });
          }}
        >
          <option value="">{t({ en: "All accounts", zh: "全部账户" })}</option>
          {accountGroups.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {accounts
                .filter((account) => account.groupId === group.id)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {lookups.accountLabelById.get(account.id) ?? account.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t({ en: "Category", zh: "分类" })}
          value={filters.categoryIds.length === 1 ? filters.categoryIds[0] : ""}
          isActive={filters.categoryIds.length > 0}
          onChange={(value) => {
            set({ categoryIds: value === "" ? [] : [value] });
          }}
        >
          <option value="">
            {t({ en: "All categories", zh: "全部分类" })}
          </option>
          {parents.map((parent) => (
            <optgroup
              key={parent.id}
              label={`${parent.emoji} ${categoryName(parent)}`.trim()}
            >
              <option value={parent.id}>{categoryName(parent)}</option>
              {childrenOf(parent.id).map((child) => (
                <option key={child.id} value={child.id}>
                  {`  ${categoryName(child)}`}
                </option>
              ))}
            </optgroup>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t({ en: "Dates", zh: "日期" })}
          value={range}
          isActive={range !== "any"}
          onChange={(value) => {
            const key = PRESETS.find((preset) => preset === value);
            if (key) set(rangeOf(key, today));
            else if (value === "any") set({ from: null, to: null });
            else
              set({
                from: filters.from ?? startOfMonth(today),
                to: filters.to ?? today,
              });
          }}
        >
          <option value="any">{t({ en: "Any time", zh: "全部时间" })}</option>
          <option value="thisMonth">
            {t({ en: "This month", zh: "本月" })}
          </option>
          <option value="lastMonth">
            {t({ en: "Last month", zh: "上月" })}
          </option>
          <option value="threeMonths">
            {t({ en: "Last 3 months", zh: "近 3 个月" })}
          </option>
          <option value="thisYear">{t({ en: "This year", zh: "今年" })}</option>
          <option value="custom">{t({ en: "Custom…", zh: "自定义…" })}</option>
        </FilterSelect>
        {range === "custom" ? (
          <>
            <DayInput
              css={styles.select}
              label={t({ en: "From", zh: "开始" })}
              value={filters.from ?? ""}
              onChange={(from) => {
                set({ from });
              }}
            />
            <DayInput
              css={styles.select}
              label={t({ en: "To", zh: "结束" })}
              value={filters.to ?? ""}
              onChange={(to) => {
                set({ to });
              }}
            />
          </>
        ) : null}
        {filters.payeeIds.map((id) => (
          <Chip
            key={id}
            size="sm"
            isActive
            aria-label={`${removeLabel} ${lookups.payeeById.get(id)?.name ?? ""}`}
            trailing={<XIcon weight="bold" aria-hidden />}
            onClick={() => {
              set({
                payeeIds: filters.payeeIds.filter((other) => other !== id),
              });
            }}
          >
            {lookups.payeeById.get(id)?.name ?? "…"}
          </Chip>
        ))}
        {filters.tagIds.map((id) => (
          <Chip
            key={id}
            size="sm"
            isActive
            aria-label={`${removeLabel} #${lookups.tagById.get(id)?.name ?? ""}`}
            trailing={<XIcon weight="bold" aria-hidden />}
            onClick={() => {
              set({ tagIds: filters.tagIds.filter((other) => other !== id) });
            }}
          >
            {`#${lookups.tagById.get(id)?.name ?? "…"}`}
          </Chip>
        ))}
      </div>
      {transactionFilters.isEmpty({ ...filters, query: "" }) ? null : (
        <Chip
          size="sm"
          onClick={() => {
            onChange({ ...EMPTY_TRANSACTION_FILTERS, query: filters.query });
          }}
        >
          {t({ en: "Clear filters", zh: "清除筛选" })}
        </Chip>
      )}
    </div>
  );
}

const styles = stylex.create({
  bar: {
    minInlineSize: 0,
  },
  narrowOnly: {
    display: { default: "contents", [breakpoints.md]: "none" },
  },
  more: {
    display: "contents",
  },
  collapsed: {
    display: { default: "none", [breakpoints.md]: "contents" },
  },
  select: {
    appearance: "auto",
    maxInlineSize: "14rem",
    paddingInlineEnd: space._1,
  },
});
