"use client";

import { t } from "@tuja/i18n";
import { FilterChips } from "@tuja/ui/components/filter-chips";
import { useState } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";

function ActivityFilter() {
  const [filter, setFilter] = useState("all");
  return (
    <FilterChips
      aria-label={t({ en: "Show", zh: "显示" })}
      value={filter}
      onChange={setFilter}
      options={[
        { value: "all", label: t({ en: "All", zh: "全部" }), count: 212 },
        { value: "filed", label: t({ en: "Filed", zh: "已归档" }), count: 148 },
        {
          value: "archived",
          label: t({ en: "Archived", zh: "已存档" }),
          count: 41,
        },
        { value: "junk", label: t({ en: "Junk", zh: "垃圾邮件" }), count: 19 },
        {
          value: "problems",
          label: t({ en: "Problems", zh: "问题" }),
          count: 1,
          countIntent: "danger",
        },
      ]}
    />
  );
}

export function FilterChipsCountsExample() {
  return (
    <Specimen
      caption={t({
        en: "counts, one that needs attention",
        zh: "带数字，其中一项需要关注",
      })}
    >
      <ActivityFilter />
    </Specimen>
  );
}

function CategoryFilter() {
  const [filter, setFilter] = useState("all");
  return (
    <FilterChips
      aria-label={t({ en: "Category", zh: "分类" })}
      value={filter}
      onChange={setFilter}
      scrollButtons={{
        startLabel: t({ en: "Earlier categories", zh: "前面的分类" }),
        endLabel: t({ en: "More categories", zh: "更多分类" }),
      }}
      options={[
        { value: "all", label: t({ en: "All", zh: "全部" }) },
        { value: "groceries", label: t({ en: "Groceries", zh: "日用杂货" }) },
        { value: "eating-out", label: t({ en: "Eating out", zh: "外出就餐" }) },
        { value: "transport", label: t({ en: "Transport", zh: "交通" }) },
        { value: "bills", label: t({ en: "Bills", zh: "账单" }) },
        { value: "rent", label: t({ en: "Rent", zh: "房租" }) },
        { value: "shopping", label: t({ en: "Shopping", zh: "购物" }) },
        { value: "health", label: t({ en: "Health", zh: "健康" }) },
        { value: "travel", label: t({ en: "Travel", zh: "旅行" }) },
        { value: "gifts", label: t({ en: "Gifts", zh: "礼物" }) },
        {
          value: "subscriptions",
          label: t({ en: "Subscriptions", zh: "订阅" }),
        },
        { value: "savings", label: t({ en: "Savings", zh: "储蓄" }) },
        { value: "income", label: t({ en: "Income", zh: "收入" }) },
      ]}
    />
  );
}

export function FilterChipsOverflowExample() {
  return (
    <Specimen
      caption={t({ en: "a row wider than its box", zh: "比容器更宽的一行" })}
    >
      <CategoryFilter />
    </Specimen>
  );
}
