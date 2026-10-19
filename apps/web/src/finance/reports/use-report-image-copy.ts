import { t } from "#src/i18n.ts";
import { useSystemCategoryNames } from "../store/use-category-display-name.ts";

export type ReportImageCopy = {
  title: string;
  netWorth: string;
  thisWeek: string;
  sinceYearStart: string;
  byGroup: string;
  /** `{change}` is the Group's change over the week. */
  groupChange: string;
  noChange: string;
  /** `{amount}` is what a liability Group owes. */
  owed: string;
  owedMore: string;
  owedLess: string;
  spentThisWeek: string;
  aboveAverage: string;
  belowAverage: string;
  atAverage: string;
  fourWeekAverage: string;
  byCategory: string;
  noSpending: string;
  uncategorised: string;
};

/** The words of the share image in the reader's language. */
export function useReportImageCopy(): ReportImageCopy {
  return {
    title: t({ en: "Weekly report", zh: "周报" }),
    netWorth: t({ en: "Net worth", zh: "净资产" }),
    thisWeek: t({ en: "This week", zh: "本周" }),
    sinceYearStart: t({ en: "Since 1 Jan", zh: "今年以来" }),
    byGroup: t({ en: "By group", zh: "分组" }),
    groupChange: t({ en: "{change} this week", zh: "本周 {change}" }),
    noChange: t({ en: "No change this week", zh: "本周无变化" }),
    owed: t({ en: "{amount} owed", zh: "{amount} 待还" }),
    owedMore: t({ en: "{amount} more", zh: "多欠 {amount}" }),
    owedLess: t({ en: "{amount} less", zh: "少欠 {amount}" }),
    spentThisWeek: t({ en: "Spent this week", zh: "本周支出" }),
    aboveAverage: t({
      en: "{amount} above the 4-week average",
      zh: "比 4 周平均多 {amount}",
    }),
    belowAverage: t({
      en: "{amount} below the 4-week average",
      zh: "比 4 周平均少 {amount}",
    }),
    atAverage: t({
      en: "The same as the 4-week average",
      zh: "与 4 周平均持平",
    }),
    fourWeekAverage: t({ en: "4-week average", zh: "4 周平均" }),
    byCategory: t({ en: "By category", zh: "分类" }),
    noSpending: t({ en: "Nothing spent this week", zh: "本周没有支出" }),
    ...useSystemCategoryNames(),
  };
}
