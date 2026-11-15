import { t } from "@tuja/i18n";
import type { TransactionRow } from "../sync/row-schemas.ts";
import type { AiDoubt, AiDoubtSubject } from "./parse-ai-doubts.ts";
import { useTransactionKindLabels } from "./use-transaction-kind-labels.ts";

function isKind(label: string): label is TransactionRow["kind"] {
  return label === "expense" || label === "income" || label === "transfer";
}

/** Turns a doubt of the labeller into the words a Member reads: what it was unsure of, and the answers it weighed. */
export function useAiDoubtText() {
  const kindLabels = useTransactionKindLabels();
  const subjects: Record<AiDoubtSubject, string> = {
    kind: t({ en: "Unsure of the kind", zh: "拿不准类型" }),
    category: t({ en: "Unsure of the category", zh: "拿不准分类" }),
    payee: t({ en: "Unsure of the payee", zh: "拿不准商家" }),
    "other side": t({
      en: "Unsure of the other side",
      zh: "拿不准转到哪个账户",
    }),
    "loan or money owed": t({
      en: "Unsure what it pays off",
      zh: "拿不准还的是哪笔欠款",
    }),
  };
  const optionLabel = (subject: AiDoubtSubject, label: string) => {
    if (subject === "kind" && isKind(label)) return kindLabels[label];
    // The labeller names a category by its path; the list names it by its own name.
    if (subject === "category") return label.split(" > ").at(-1) ?? label;
    return label;
  };
  return {
    subject: (doubt: AiDoubt) => subjects[doubt.subject],
    options: (doubt: AiDoubt) =>
      doubt.options
        .map(
          (option) =>
            `${optionLabel(doubt.subject, option.label)} ${String(option.percent)}%`,
        )
        .join(" · "),
  };
}
