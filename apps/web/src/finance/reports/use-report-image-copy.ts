import { t } from "#src/i18n.ts";
import { useSystemAccountNames } from "../store/use-account-display-name.ts";
import { useSystemCategoryNames } from "../store/use-category-display-name.ts";

export type ReportImageCopy = {
  title: string;
  netWorth: string;
  vsLastWeek: string;
  sinceYearStart: string;
  balanceSheet: string;
  account: string;
  group: string;
  balance: string;
  thisWeek: string;
  assets: string;
  liabilities: string;
  trend: string;
  average: string;
  groupNets: string;
  spentThisWeek: string;
  topPayees: string;
  vsAverage: string;
  fourWeekAverage: string;
  income: string;
  noSpending: string;
  uncategorised: string;
  inTransit: string;
};

/** The words of the share image in the reader's language. */
export function useReportImageCopy(): ReportImageCopy {
  return {
    title: t({ en: "Weekly report", zh: "周报" }),
    netWorth: t({ en: "Net worth", zh: "净资产" }),
    vsLastWeek: t({ en: "vs last week", zh: "较上周" }),
    sinceYearStart: t({ en: "since 1 Jan", zh: "今年以来" }),
    balanceSheet: t({ en: "Balance sheet", zh: "资产负债表" }),
    account: t({ en: "Account", zh: "账户" }),
    group: t({ en: "Group", zh: "分组" }),
    balance: t({ en: "Balance", zh: "余额" }),
    thisWeek: t({ en: "This week", zh: "本周变化" }),
    assets: t({ en: "Assets", zh: "资产" }),
    liabilities: t({ en: "Liabilities", zh: "负债" }),
    trend: t({ en: "Net worth trend", zh: "净资产趋势" }),
    average: t({ en: "13-week average", zh: "13 周均线" }),
    groupNets: t({ en: "Net by group", zh: "分组净值" }),
    spentThisWeek: t({ en: "Spent this week", zh: "本周支出" }),
    topPayees: t({ en: "Top payees", zh: "主要商家" }),
    vsAverage: t({ en: "vs 4-week average", zh: "较 4 周平均" }),
    fourWeekAverage: t({ en: "4-week average", zh: "4 周平均" }),
    income: t({ en: "Income", zh: "收入" }),
    noSpending: t({ en: "Nothing spent this week", zh: "本周没有支出" }),
    ...useSystemAccountNames(),
    ...useSystemCategoryNames(),
  };
}
