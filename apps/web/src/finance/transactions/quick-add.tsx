"use client";

import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { TextField } from "@tuja/ui/components/text-field";
import { useState } from "react";
import { isPickableAccount } from "../domain/accounts/is-pickable-account.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { buildTransactionMutations } from "../editor/build-transaction-mutations.ts";
import type { EditorDraft } from "../editor/editor-draft.ts";
import { useEditorData, type EditorData } from "../editor/use-editor-data.ts";
import { applyAll } from "../replica/apply-with-undo.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUndoToast } from "../shell/use-undo-toast.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import { parseQuickAdd } from "./parse-quick-add.ts";
import { quickAddDraft } from "./quick-add-draft.ts";
import { useTransactionKindLabels } from "./use-transaction-kind-labels.ts";

interface QuickAddProps {
  /** Opens the full editor with what the line gave, when the line is not enough to save. */
  onNeedsEditor: (draft: EditorDraft) => void;
}

/** Words from the Household's own data, so each placeholder example saves as it reads. */
function placeholderWords({
  transactions,
  lookups,
  entriesByTransaction,
}: Pick<EditorData, "transactions" | "lookups" | "entriesByTransaction">) {
  let payee: string | undefined;
  let income: string | undefined;
  let target: string | undefined;
  for (const row of transactions) {
    if (row.status !== "posted") continue;
    if (payee === undefined && row.kind === "expense" && row.payeeId) {
      payee = lookups.payeeById.get(row.payeeId)?.name;
    } else if (
      income === undefined &&
      row.kind === "income" &&
      row.categoryId
    ) {
      const category = lookups.categoryById.get(row.categoryId);
      if (category && !category.isSystem) income = category.name;
    } else if (target === undefined && row.kind === "transfer") {
      const to = entriesByTransaction
        .get(row.id)
        ?.find((entry) => entry.amountMinor > 0);
      const account = to ? lookups.accountById.get(to.accountId) : undefined;
      if (account?.deletedAt === null && isPickableAccount(account)) {
        target = account.name;
      }
    }
    if (payee && income && target) break;
  }
  return { payee, income, target };
}

/**
 * One line for the common case (design §9.1): `12.5 tesco`, `+2000 salary`
 * or `500 > isa`. Enter saves at once with the rest from the Payee's last
 * Transaction; when something is missing, the full editor opens with what
 * the line gave.
 */
export function QuickAdd({ onNeedsEditor }: QuickAddProps) {
  const locale = useLocale();
  const data = useEditorData();
  const isWide = useIsWideLayout();
  const { transactions, lookups, entriesByTransaction } = data;
  const words = placeholderWords({
    transactions,
    lookups,
    entriesByTransaction,
  });
  const store = useReplicaStore();
  const showUndoToast = useUndoToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = parseQuickAdd(text, data.baseCurrency);
  const preview = parsed ? quickAddDraft(data, parsed) : null;

  const kindLabels = useTransactionKindLabels();
  const addedLabel = t({ en: "Added", zh: "已记录" });
  const categoryName = useCategoryDisplayName();
  const paysDownLabel = t({ en: "pays down", zh: "还款到" });
  const examplePayee = words.payee ?? t({ en: "Tesco", zh: "Tesco" });
  const exampleIncome = words.income ?? t({ en: "Salary", zh: "工资" });
  const exampleTarget = words.target ?? t({ en: "ISA", zh: "ISA" });
  const placeholder = [
    `12.50 ${examplePayee}`,
    `+2000 ${exampleIncome}`,
    ...(isWide ? [`500 > ${exampleTarget}`] : []),
  ].join(" · ");
  const noAmount = t({
    en: "Start or end with an amount, such as 12.50 Tesco.",
    zh: "请以金额开头或结尾，例如 12.50 Tesco。",
  });
  const opensEditor = t({
    en: "Enter opens the form",
    zh: "按 Enter 打开表单",
  });
  const savesNow = t({ en: "Enter saves", zh: "按 Enter 保存" });

  const describe = () => {
    if (!preview || !parsed) return null;
    const { draft } = preview;
    const parts: string[] = [kindLabels[draft.kind]];
    const currency =
      (draft.accountId === null
        ? undefined
        : data.lookups.accountById.get(draft.accountId)?.currency) ??
      data.baseCurrency;
    const minor = parseMoney(draft.amountText, currency);
    if (minor !== null) parts.push(formatMoney(minor, currency, locale));
    if (draft.kind === "transfer") {
      const from =
        draft.accountId === null
          ? "?"
          : (data.lookups.accountLabelById.get(draft.accountId) ?? "?");
      const to =
        draft.toAccountId === null
          ? "?"
          : (data.lookups.accountLabelById.get(draft.toAccountId) ?? "?");
      parts.push(`${from} → ${to}`);
    } else {
      if (preview.payeeName) parts.push(preview.payeeName);
      const category =
        draft.categoryId === null
          ? undefined
          : data.lookups.categoryById.get(draft.categoryId);
      if (category) parts.push(categoryName(category));
      if (draft.accountId !== null) {
        parts.push(data.lookups.accountLabelById.get(draft.accountId) ?? "");
      }
      if (draft.paysDownAccountId !== null) {
        parts.push(
          `${paysDownLabel} ${data.lookups.accountLabelById.get(draft.paysDownAccountId) ?? ""}`,
        );
      }
    }
    parts.push(preview.complete ? savesNow : opensEditor);
    return parts.filter((part) => part !== "").join(" · ");
  };

  const submit = () => {
    if (!parsed || !preview) return;
    if (parsed.amountMinor === null) {
      setError(noAmount);
      return;
    }
    if (!preview.complete) {
      onNeedsEditor(preview.draft);
      setText("");
      return;
    }
    const id = crypto.randomUUID();
    const result = buildTransactionMutations(preview.draft, {
      target: { type: "create", id },
      accountById: data.lookups.accountById,
      payees: data.payees,
      baseCurrency: data.baseCurrency,
      createId: () => crypto.randomUUID(),
    });
    if (!result.ok) {
      onNeedsEditor(preview.draft);
      setText("");
      return;
    }
    try {
      applyAll(store, result.mutations);
    } catch {
      onNeedsEditor(preview.draft);
      setText("");
      return;
    }
    const summary = describe()?.split(" · ").slice(1, 3).join(" · ") ?? "";
    showUndoToast(
      summary === "" ? addedLabel : `${addedLabel} · ${summary}`,
      result.undo,
    );
    setText("");
  };

  return (
    <form
      aria-label={t({ en: "Quick add", zh: "快速记账" })}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label={t({ en: "Quick add", zh: "快速记账" })}
        labelHidden
        placeholder={placeholder}
        leading={<LightningIcon weight="bold" />}
        autoComplete="off"
        enterKeyHint="done"
        status={error === null ? (describe() ?? "") : ""}
        error={error ?? undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
      />
    </form>
  );
}
