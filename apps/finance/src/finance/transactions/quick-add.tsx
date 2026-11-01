"use client";

import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { TextField } from "@tuja/ui/components/text-field";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { isPickableAccount } from "../domain/accounts/is-pickable-account.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { buildTransactionMutations } from "../editor/build-transaction-mutations.ts";
import type { EditorDraft } from "../editor/editor-draft.ts";
import { missingFields, type RequiredField } from "../editor/marked-fields.ts";
import type { EditorSeed } from "../editor/transaction-editor.tsx";
import { useEditorData, type EditorData } from "../editor/use-editor-data.ts";
import { applyAll } from "../replica/apply-with-undo.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUndoToast } from "../shell/use-undo-toast.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import { QuickAddChips } from "./quick-add-chips.tsx";
import { currencyOfAccount } from "./quick-add-draft.ts";
import { useQuickAddDraft } from "./use-quick-add-draft.ts";
import {
  useQuickAddInterpretation,
  type QuickAddInterpretationState,
} from "./use-quick-add-interpretation.ts";

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
  status?: string;
  /** The id of a line elsewhere that describes the field. */
  describedBy?: string;
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
  describedBy,
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
      aria-describedby={describedBy}
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
 * Quick add over the Transactions list (design §9.1). Under the field, one
 * chip for each field of the reading, which opens that field's picker; a
 * field changed there keeps its value through later readings. The line
 * under the chips says who read the line and what Enter does: save when
 * nothing is missing, or else open the full editor with what the line gave,
 * at the first missing field.
 */
export function QuickAdd({ onNeedsEditor }: QuickAddProps) {
  const locale = useLocale();
  const data = useEditorData();
  const store = useReplicaStore();
  const showUndoToast = useUndoToast();
  const footerId = useId();
  const [text, setText] = useState("");
  const reading = useQuickAddInterpretation(text);
  const { current, change } = useQuickAddDraft(reading.interpretation);
  const note = useReaderNote(reading.interpretation);

  const addedLabel = t({ en: "Added", zh: "已记录" });
  const categoryName = useCategoryDisplayName();
  const enterKey = t({ en: "Enter: ", zh: "按 Enter " });
  const reads = t({ en: "Reading…", zh: "识别中…" });
  const saves = t({ en: "Save", zh: "保存" });
  const fillsIn: Record<RequiredField, string> = {
    amount: t({ en: "Fill in amount", zh: "补上金额" }),
    category: t({ en: "Fill in category", zh: "补上分类" }),
    account: t({ en: "Fill in account", zh: "补上账户" }),
    toAccount: t({ en: "Fill in target account", zh: "补上转入账户" }),
  };

  const missing = current ? missingFields(current.draft) : [];
  const firstMissing = missing.at(0);
  const enterDoes = !reading.isCurrent
    ? undefined
    : current === null
      ? null
      : firstMissing === undefined
        ? saves
        : fillsIn[firstMissing];

  /** The amount and the Payee or Category, for the toast. */
  const summary = (draft: EditorDraft) => {
    const currency = currencyOfAccount(data, draft.accountId);
    const minor = parseMoney(draft.amountText, currency);
    const category =
      draft.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(draft.categoryId);
    return [
      minor === null ? undefined : formatMoney(minor, currency, locale),
      draft.kind === "transfer"
        ? undefined
        : draft.payeeName.trim() ||
          (category ? categoryName(category) : undefined),
    ].filter((part) => part !== undefined);
  };

  const submit = () => {
    if (!current) return;
    const { draft, marks, touched } = current;
    const openEditor = () => {
      onNeedsEditor({
        draft,
        marks,
        touched: [...touched],
        focus: firstMissing,
      });
      setText("");
    };
    if (firstMissing !== undefined) {
      openEditor();
      return;
    }
    const result = buildTransactionMutations(draft, {
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
    showUndoToast([addedLabel, ...summary(draft)].join(" · "), result.undo);
    setText("");
  };

  return (
    <div css={stack.tight}>
      <QuickAddField
        text={text}
        onTextChange={setText}
        reading={reading}
        describedBy={text.trim() === "" ? undefined : footerId}
        onEnter={submit}
      />
      {current ? (
        <QuickAddChips
          draft={current.draft}
          marks={current.marks}
          touched={current.touched}
          muted={!reading.isCurrent}
          onChange={change}
        />
      ) : null}
      {text.trim() === "" ? null : (
        <div
          id={footerId}
          role="status"
          css={[flex.between, typeRole.caption, styles.footer]}
        >
          <span>{note}</span>
          {enterDoes === null ? null : (
            <span>
              {enterDoes === undefined ? (
                reads
              ) : (
                <>
                  <kbd aria-hidden css={styles.key}>
                    {"↵ "}
                  </kbd>
                  <span css={a11y.srOnly}>{enterKey}</span>
                  {enterDoes}
                </>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  footer: {
    gap: rhythm.inline,
    color: color.fgMuted,
  },
  key: {
    fontFamily: "inherit",
  },
});
