"use client";

import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { TextField } from "@tuja/ui/components/text-field";
import { useEffect, useRef, useState, type RefObject } from "react";
import { isPickableAccount } from "../domain/accounts/is-pickable-account.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { buildTransactionMutations } from "../editor/build-transaction-mutations.ts";
import {
  fieldStatus,
  missingFields,
  type MarkedField,
} from "../editor/marked-fields.ts";
import type { EditorSeed } from "../editor/transaction-editor.tsx";
import { useEditorData, type EditorData } from "../editor/use-editor-data.ts";
import { applyAll } from "../replica/apply-with-undo.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUndoToast } from "../shell/use-undo-toast.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import { currencyOfAccount } from "./quick-add-draft.ts";
import {
  useQuickAddInterpretation,
  type QuickAddInterpretationState,
} from "./use-quick-add-interpretation.ts";
import { useTransactionKindLabels } from "./use-transaction-kind-labels.ts";

/** Words from the Household's own data, so each placeholder example reads as its own. */
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

/** Who read the line, for the note under the field. */
export function useReaderNote(
  interpretation: QuickAddInterpretationState["interpretation"],
) {
  const byAi = t({ en: "Read by AI", zh: "AI 识别" });
  const offline = t({ en: "Offline · read by rules", zh: "离线 · 按规则识别" });
  const byRules = t({ en: "Read by rules", zh: "按规则识别" });
  if (!interpretation) return "";
  if (interpretation.via === "ai") return byAi;
  return interpretation.isFallback ? offline : byRules;
}

interface QuickAddFieldProps {
  text: string;
  onTextChange: (text: string) => void;
  reading: QuickAddInterpretationState;
  /** The live line under the field. */
  status: string;
  /** Enter, once the reading is of the text as it is now. */
  onEnter: (input: HTMLInputElement) => void;
  /**
   * Asks for focus when the line mounts, and receives the field that takes
   * it, for a sheet that moves focus after it opens.
   */
  focusTargetRef?: RefObject<HTMLElement | null>;
}

/**
 * The quick add field: anything from `tesco 12.5` to a pasted bank text.
 * Enter before the reading is of the text as it is now asks for it at once
 * and saves nothing, so a Member sees what Enter saves first. It is not a
 * form of its own, so it can also go in the editor's form, and Enter in it
 * does not submit that form.
 */
export function QuickAddField({
  text,
  onTextChange,
  reading,
  status,
  onEnter,
  focusTargetRef,
}: QuickAddFieldProps) {
  const data = useEditorData();
  const isWide = useIsWideLayout();
  const words = placeholderWords(data);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusTargetRef) return;
    focusTargetRef.current = inputRef.current;
    inputRef.current?.focus({ preventScroll: true });
  }, [focusTargetRef]);

  const examplePayee = words.payee ?? t({ en: "Tesco", zh: "Tesco" });
  const exampleIncome = words.income ?? t({ en: "Salary", zh: "工资" });
  const exampleTarget = words.target ?? t({ en: "ISA", zh: "ISA" });
  const placeholder = [
    `${examplePayee} 12.50`,
    `${exampleIncome} 2000`,
    ...(isWide
      ? [`${t({ en: "500 to", zh: "转 500 到" })} ${exampleTarget}`]
      : []),
  ].join(" · ");

  return (
    <TextField
      ref={inputRef}
      label={t({ en: "Quick add", zh: "快速记账" })}
      labelHidden
      placeholder={placeholder}
      leading={<LightningIcon weight="bold" />}
      autoComplete="off"
      enterKeyHint="done"
      aria-busy={!reading.isCurrent}
      status={status}
      value={text}
      onChange={(event) => {
        onTextChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        if (text.trim() === "") return;
        if (!reading.isCurrent || !reading.interpretation) {
          reading.interpretNow();
          return;
        }
        onEnter(event.currentTarget);
      }}
    />
  );
}

interface QuickAddProps {
  /** Opens the full editor with what the line gave, when the line is not enough to save. */
  onNeedsEditor: (seed: EditorSeed) => void;
}

/**
 * Quick add over the Transactions list (design §9.1). The line under the
 * field says what Enter saves: each field the reading is not sure of ends in
 * "?", and a field a save needs says that it is missing. Enter saves when
 * nothing is missing; otherwise the full editor opens with what the line
 * gave, at the first missing field.
 */
export function QuickAdd({ onNeedsEditor }: QuickAddProps) {
  const locale = useLocale();
  const data = useEditorData();
  const store = useReplicaStore();
  const showUndoToast = useUndoToast();
  const [text, setText] = useState("");
  const reading = useQuickAddInterpretation(text);
  const { interpretation } = reading;
  const current = interpretation?.readings[interpretation.kind];
  const note = useReaderNote(interpretation);

  const kindLabels = useTransactionKindLabels();
  const addedLabel = t({ en: "Added", zh: "已记录" });
  const categoryName = useCategoryDisplayName();
  const paysDownLabel = t({ en: "pays down", zh: "还款到" });
  const missingLabels: Partial<Record<MarkedField, string>> = {
    amount: t({ en: "Missing amount", zh: "缺少金额" }),
    category: t({ en: "Missing category", zh: "缺少分类" }),
    account: t({ en: "Missing account", zh: "缺少账户" }),
    toAccount: t({ en: "Missing target account", zh: "缺少转入账户" }),
  };
  const reads = t({ en: "Reading…", zh: "识别中…" });
  const opensEditor = t({
    en: "Enter opens the form",
    zh: "按 Enter 打开表单",
  });
  const savesNow = t({ en: "Enter saves", zh: "按 Enter 保存" });

  const accountLabel = (accountId: string | null) =>
    accountId === null
      ? undefined
      : data.lookups.accountLabelById.get(accountId);

  /** The amount and the Payee, Category or accounts, for the hint and the toast. */
  const summary = () => {
    if (!current) return { amount: undefined, name: undefined };
    const { draft } = current;
    const currency = currencyOfAccount(data, draft.accountId);
    const minor = parseMoney(draft.amountText, currency);
    const category =
      draft.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(draft.categoryId);
    return {
      amount: minor === null ? undefined : formatMoney(minor, currency, locale),
      name:
        draft.kind === "transfer"
          ? undefined
          : draft.payeeName.trim() ||
            (category ? categoryName(category) : undefined),
    };
  };

  const describe = () => {
    if (!interpretation || !current) return reading.isCurrent ? "" : reads;
    const { draft, marks } = current;
    const shown = (field: MarkedField, text: string | undefined) => {
      const status = fieldStatus(draft, marks, field);
      if (status === "missing") return missingLabels[field];
      return text !== undefined && status === "unsure" ? `${text}?` : text;
    };
    const category =
      draft.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(draft.categoryId);
    const parts = [
      note,
      shown("kind", kindLabels[draft.kind]),
      shown("amount", summary().amount),
      ...(draft.kind === "transfer"
        ? [
            `${shown("account", accountLabel(draft.accountId)) ?? ""} → ${shown("toAccount", accountLabel(draft.toAccountId)) ?? ""}`,
          ]
        : [
            shown("payee", draft.payeeName.trim() || undefined),
            shown("category", category ? categoryName(category) : undefined),
            shown("account", accountLabel(draft.accountId)),
            draft.paysDownAccountId === null
              ? undefined
              : shown(
                  "paysDown",
                  `${paysDownLabel} ${accountLabel(draft.paysDownAccountId) ?? ""}`,
                ),
          ]),
      !reading.isCurrent
        ? reads
        : missingFields(draft).length > 0
          ? opensEditor
          : savesNow,
    ];
    return parts
      .filter((part): part is string => part !== undefined && part !== "")
      .join(" · ");
  };

  const submit = () => {
    if (!current) return;
    const missing = missingFields(current.draft);
    const seed: EditorSeed = {
      draft: current.draft,
      marks: current.marks,
      focus: missing.at(0),
    };
    const openEditor = () => {
      onNeedsEditor(seed);
      setText("");
    };
    if (missing.length > 0) {
      openEditor();
      return;
    }
    const result = buildTransactionMutations(current.draft, {
      target: { type: "create", id: crypto.randomUUID() },
      accountById: data.lookups.accountById,
      payees: data.payees,
      baseCurrency: data.baseCurrency,
      createId: () => crypto.randomUUID(),
    });
    if (!result.ok) {
      openEditor();
      return;
    }
    try {
      applyAll(store, result.mutations);
    } catch {
      openEditor();
      return;
    }
    const { amount, name } = summary();
    showUndoToast(
      [addedLabel, amount, name]
        .filter((part) => part !== undefined)
        .join(" · "),
      result.undo,
    );
    setText("");
  };

  return (
    <QuickAddField
      text={text}
      onTextChange={setText}
      reading={reading}
      status={describe()}
      onEnter={submit}
    />
  );
}
