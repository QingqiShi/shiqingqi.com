import type { SupportedLocale } from "@tuja/i18n/types";

/** A large GBP amount written short, such as `£2bn` or `£20亿`. */
export function formatCompactMoney(
  amountGbp: number,
  locale: SupportedLocale,
): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountGbp);
}
