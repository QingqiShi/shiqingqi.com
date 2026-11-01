import { useState } from "react";
import type { EditorDraft } from "../editor/editor-draft.ts";
import type { FieldMarks, MarkedField } from "../editor/marked-fields.ts";
import { ownerOfAccount } from "../editor/owner-of-account.ts";
import { useEditorData, type EditorData } from "../editor/use-editor-data.ts";
import { fillFromInterpretation } from "./fill-from-interpretation.ts";
import type { QuickAddInterpretation } from "./interpret-quick-add.ts";
import type { TransactionKind } from "./transaction-filters.ts";

interface QuickAddDraft {
  draft: EditorDraft;
  marks: FieldMarks;
  /** Fields the Member changed by hand, which a later reading keeps. */
  touched: ReadonlySet<MarkedField>;
  /** The interpretation the draft took its other fields from. */
  appliedId: number;
}

function isKind(value: string): value is TransactionKind {
  return value === "expense" || value === "income" || value === "transfer";
}

/** The draft fields that give `field` the value of a mark's runner-up. */
export function fieldsOfRunnerUp(
  data: EditorData,
  field: MarkedField,
  value: string,
): Partial<EditorDraft> {
  switch (field) {
    case "kind":
      return isKind(value) ? { kind: value } : {};
    case "amount":
      return { amountText: value };
    case "payee":
      return {
        payeeName: value,
        payeeId: data.payees.find((payee) => payee.name === value)?.id ?? null,
      };
    case "category":
      return { categoryId: value };
    case "account":
      return { accountId: value };
    case "toAccount":
      return { toAccountId: value };
    case "paysDown":
      return { paysDownAccountId: value };
    case "date":
      return { date: value };
    case "member":
      return { memberId: value };
    case "tags":
      return {};
  }
}

function applied(
  data: EditorData,
  previous: QuickAddDraft | null,
  interpretation: QuickAddInterpretation,
): QuickAddDraft {
  if (!previous || previous.touched.size === 0) {
    const reading = interpretation.readings[interpretation.kind];
    return {
      draft: reading.draft,
      marks: reading.marks,
      touched: new Set(),
      appliedId: interpretation.id,
    };
  }
  return {
    ...fillFromInterpretation(
      data,
      previous.draft,
      previous.marks,
      previous.touched,
      interpretation,
    ),
    touched: previous.touched,
    appliedId: interpretation.id,
  };
}

/**
 * What quick add on the Transactions screen saves: each new reading of the
 * line fills the fields the Member has not changed by hand. A changed field
 * keeps its value until the line is empty again.
 */
export function useQuickAddDraft(
  interpretation: QuickAddInterpretation | null,
) {
  const data = useEditorData();
  const [state, setState] = useState<QuickAddDraft | null>(null);
  let current = state;
  if (interpretation === null) {
    current = null;
    if (state !== null) setState(null);
  } else if (state?.appliedId !== interpretation.id) {
    current = applied(data, state, interpretation);
    setState(current);
  }

  /** Sets `field` by hand. Its kind's reading fills the fields it leaves. */
  const change = (field: MarkedField, fields: Partial<EditorDraft>) => {
    if (!current || !interpretation) return;
    const touched = new Set([...current.touched, field]);
    const marks: FieldMarks = { ...current.marks, [field]: undefined };
    const filled = fillFromInterpretation(
      data,
      { ...current.draft, ...fields },
      marks,
      touched,
      interpretation,
    );
    const owner = ownerOfAccount(data, filled.draft.accountId);
    if (touched.has("account") && !touched.has("member") && owner !== null) {
      filled.draft.memberId = owner;
    }
    setState({ ...filled, touched, appliedId: current.appliedId });
  };

  return { current, change };
}
