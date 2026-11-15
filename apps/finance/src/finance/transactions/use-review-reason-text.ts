import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseAiDoubts } from "./parse-ai-doubts.ts";
import type { ReviewReason } from "./review-reason.ts";
import { useAiDoubtText } from "./use-ai-doubt-text.ts";

/** Turns a Review reason into the sentence a Member reads. */
export function useReviewReasonText() {
  const locale = useLocale();
  const doubtText = useAiDoubtText();
  const whereDidItGo = t({
    en: "Where did this {amount} go?",
    zh: "这笔 {amount} 转去哪了？",
  });
  const couldNotLabel = t({
    en: "AI could not label this",
    zh: "AI 无法标注这笔交易",
  });
  const separator = t({ en: ": ", zh: "：" });
  const joiner = t({ en: "; ", zh: "；" });
  return (reason: ReviewReason) => {
    if (reason.type === "ai") {
      const doubts = parseAiDoubts(reason.text);
      if (doubts === null) return reason.text;
      return doubts
        .map(
          (doubt) =>
            `${doubtText.subject(doubt)}${separator}${doubtText.options(doubt)}`,
        )
        .join(joiner);
    }
    if (reason.type === "aiFailed") return couldNotLabel;
    return whereDidItGo.replace(
      "{amount}",
      formatMoney(reason.amountMinor, reason.currency, locale),
    );
  };
}
