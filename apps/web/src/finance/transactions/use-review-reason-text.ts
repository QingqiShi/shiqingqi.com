import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { formatMoney } from "../domain/money/format-money.ts";
import type { ReviewReason } from "./review-reason.ts";

/** Turns a Review reason into the sentence a Member reads. */
export function useReviewReasonText() {
  const locale = useLocale();
  const whereDidItGo = t({
    en: "Where did this {amount} go?",
    zh: "这笔 {amount} 转去哪了？",
  });
  const couldNotLabel = t({
    en: "AI could not label this",
    zh: "AI 无法标注这笔交易",
  });
  return (reason: ReviewReason) => {
    if (reason.type === "ai") return reason.text;
    if (reason.type === "aiFailed") return couldNotLabel;
    return whereDidItGo.replace(
      "{amount}",
      formatMoney(reason.amountMinor, reason.currency, locale),
    );
  };
}
