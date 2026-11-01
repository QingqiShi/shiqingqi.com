import type { EditorDraft } from "../editor/editor-draft.ts";
import {
  MARKED_FIELD_KEYS,
  MARKED_FIELDS,
  type FieldMarks,
} from "../editor/marked-fields.ts";
import type { EditorData } from "../editor/use-editor-data.ts";
import type { QuickAddInterpretation } from "./interpret-quick-add.ts";
import { amountTextFor, currencyOfAccount } from "./quick-add-draft.ts";

/**
 * The editor's draft and marks after a new interpretation: each field the
 * Member has not touched takes the reading's value and mark. A touched kind,
 * or a touched Category of another kind, keeps the editor's kind, and the
 * fields come from the reading of that kind.
 */
export function fillFromInterpretation(
  data: EditorData,
  draft: EditorDraft,
  marks: FieldMarks,
  touched: ReadonlySet<string>,
  interpretation: QuickAddInterpretation,
): { draft: EditorDraft; marks: FieldMarks } {
  const touchedCategory =
    touched.has("category") && draft.categoryId !== null
      ? data.lookups.categoryById.get(draft.categoryId)
      : undefined;
  const keepsKind =
    touched.has("kind") ||
    (touchedCategory !== undefined &&
      touchedCategory.kind !== interpretation.kind);
  const kind = keepsKind ? draft.kind : interpretation.kind;
  const reading = interpretation.readings[kind];
  const next: EditorDraft = {
    ...draft,
    kind,
    refund: kind === "expense" && draft.refund,
  };
  const nextMarks: FieldMarks = { ...marks };
  for (const field of MARKED_FIELDS) {
    if (touched.has(field) || field === "kind") continue;
    for (const key of MARKED_FIELD_KEYS[field]) {
      Object.assign(next, { [key]: reading.draft[key] });
    }
    nextMarks[field] = reading.marks[field];
  }
  if (!keepsKind) nextMarks.kind = reading.marks.kind;
  if (!touched.has("amount") && reading.amountMinor !== null) {
    next.amountText = amountTextFor(
      reading.amountMinor,
      data.baseCurrency,
      currencyOfAccount(data, next.accountId),
    );
  }
  if (next.paysDownAccountId === next.accountId) {
    next.paysDownAccountId = null;
    next.paysDownAmountText = "";
  }
  return { draft: next, marks: nextMarks };
}
