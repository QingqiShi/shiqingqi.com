import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { displayDay } from "../domain/dates/display-day.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import type { EditorDraft } from "./editor-draft.ts";
import type { LabelMark } from "./field-label.tsx";
import {
  missingFields,
  type FieldMarks,
  type MarkedField,
} from "./marked-fields.ts";
import type { EditorData } from "./use-editor-data.ts";

interface FieldLabelsOptions {
  data: EditorData;
  draft: EditorDraft;
  marks: FieldMarks;
  showMissing: boolean;
}

export function useFieldLabels({
  data,
  draft,
  marks,
  showMissing,
}: FieldLabelsOptions) {
  const locale = useLocale();
  const categoryName = useCategoryDisplayName();
  const kindNames: Record<TransactionKind, string> = {
    expense: t({ en: "Expense", zh: "支出" }),
    income: t({ en: "Income", zh: "收入" }),
    transfer: t({ en: "Transfer", zh: "转账" }),
  };
  const missing = showMissing ? missingFields(draft) : [];
  const runnerUpLabel = (field: MarkedField, value: string) => {
    switch (field) {
      case "kind":
        return value === "expense" || value === "income" || value === "transfer"
          ? kindNames[value]
          : undefined;
      case "category": {
        const category = data.lookups.categoryById.get(value);
        return category ? categoryName(category) : undefined;
      }
      case "account":
      case "toAccount":
      case "paysDown":
        return data.lookups.accountLabelById.get(value);
      case "member":
        return data.lookups.memberById.get(value)?.name;
      case "date":
        return displayDay(value, locale, "weekday");
      case "amount":
      case "payee":
      case "tags":
        return value;
    }
  };
  const labelMark = (field: MarkedField): LabelMark | undefined => {
    if (missing.some((required) => required === field)) {
      return { type: "missing" };
    }
    const mark = marks[field];
    if (!mark) return undefined;
    if (mark.unsure) {
      const runnerUp =
        mark.runnerUp === undefined
          ? undefined
          : runnerUpLabel(field, mark.runnerUp);
      return runnerUp === undefined
        ? { type: "unsure" }
        : { type: "unsure", runnerUp };
    }
    return mark.source === "rules" ? undefined : { type: mark.source };
  };

  return { categoryName, kindNames, labelMark };
}
