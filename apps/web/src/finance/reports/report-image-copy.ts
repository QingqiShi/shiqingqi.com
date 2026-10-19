import type { SupportedLocale } from "#src/i18n/types.ts";

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

// t() reads the locale from the render of a page. A route handler has no
// such render, so the share image keeps its copy here.
export const reportImageCopy: Record<SupportedLocale, ReportImageCopy> = {
  en: {
    title: "Weekly report",
    netWorth: "Net worth",
    vsLastWeek: "vs last week",
    sinceYearStart: "since 1 Jan",
    balanceSheet: "Balance sheet",
    account: "Account",
    group: "Group",
    balance: "Balance",
    thisWeek: "This week",
    assets: "Assets",
    liabilities: "Liabilities",
    trend: "Net worth trend",
    average: "13-week average",
    groupNets: "Net by group",
    spentThisWeek: "Spent this week",
    topPayees: "Top payees",
    vsAverage: "vs 4-week average",
    fourWeekAverage: "4-week average",
    income: "Income",
    noSpending: "Nothing spent this week",
    uncategorised: "Uncategorised",
    inTransit: "In transit",
  },
  zh: {
    title: "周报",
    netWorth: "净资产",
    vsLastWeek: "较上周",
    sinceYearStart: "今年以来",
    balanceSheet: "资产负债表",
    account: "账户",
    group: "分组",
    balance: "余额",
    thisWeek: "本周变化",
    assets: "资产",
    liabilities: "负债",
    trend: "净资产趋势",
    average: "13 周均线",
    groupNets: "分组净值",
    spentThisWeek: "本周支出",
    topPayees: "主要商家",
    vsAverage: "较 4 周平均",
    fourWeekAverage: "4 周平均",
    income: "收入",
    noSpending: "本周没有支出",
    uncategorised: "未分类",
    inTransit: "在途",
  },
};
