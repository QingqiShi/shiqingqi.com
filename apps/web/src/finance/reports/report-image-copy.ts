import type { SupportedLocale } from "#src/i18n/types.ts";

export interface ReportImageCopy {
  title: string;
  netWorth: string;
  vsLastWeek: string;
  sinceYearStart: string;
  average: string;
  assets: string;
  liabilities: string;
  spentThisWeek: string;
  vsAverage: string;
  noSpending: string;
  uncategorised: string;
  moreAccounts: (count: number) => string;
}

// t() reads the locale from the render of a page. A route handler has no
// such render, so the share image keeps its copy here.
export const reportImageCopy: Record<SupportedLocale, ReportImageCopy> = {
  en: {
    title: "Weekly report",
    netWorth: "Net worth",
    vsLastWeek: "vs last week",
    sinceYearStart: "since 1 Jan",
    average: "13-week average",
    assets: "Assets",
    liabilities: "Liabilities",
    spentThisWeek: "Spent this week",
    vsAverage: "vs 4-week average",
    noSpending: "Nothing spent this week",
    uncategorised: "Uncategorised",
    moreAccounts: (count) => `+${String(count)} more`,
  },
  zh: {
    title: "周报",
    netWorth: "净资产",
    vsLastWeek: "较上周",
    sinceYearStart: "今年以来",
    average: "13 周均线",
    assets: "资产",
    liabilities: "负债",
    spentThisWeek: "本周支出",
    vsAverage: "较 4 周平均",
    noSpending: "本周没有支出",
    uncategorised: "未分类",
    moreAccounts: (count) => `另有 ${String(count)} 个账户`,
  },
};
