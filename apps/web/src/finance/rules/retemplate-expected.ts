import { sameSet } from "../domain/same-set.ts";
import type { TransactionPatch } from "../sync/mutation-schema.ts";
import { occurrenceFromTemplate } from "./occurrence-from-template.ts";
import type { RuleTemplate } from "./rule-template-schema.ts";
import { sameEntries } from "./same-template.ts";

interface RuleTransaction {
  id: string;
  date: string;
  kind: RuleTemplate["kind"];
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  note: string;
  /** The live Entries, in order. */
  entries: readonly {
    id: string;
    accountId: string;
    amountMinor: number;
  }[];
  tagIds: readonly string[];
}

/** The id of an Entry at a position the Transaction has no Entry for yet. */
type NewEntryId = (row: RuleTransaction, position: number) => string;

const LABEL_FIELDS = ["categoryId", "payeeId", "memberId", "note"] as const;

/** Every field of `template` as a patch for `row`; the Entry at each position keeps its id. */
export function templatePatch(
  template: RuleTemplate,
  row: RuleTransaction,
  newEntryId: NewEntryId,
) {
  return occurrenceFromTemplate(
    template,
    (position) => row.entries.at(position)?.id ?? newEntryId(row, position),
  );
}

/**
 * What a template change does to a Rule's Expected Transactions from today
 * on that no bank row is matched to, so that each looks as Materialise
 * would make it from the new template. Each one takes the fields that the
 * change touched, so a field that a Member changed on one Transaction stays
 * when the template keeps it. A Transaction that a Member gave another kind
 * stays as it is.
 */
export function retemplateExpected(
  before: RuleTemplate,
  after: RuleTemplate,
  rows: readonly RuleTransaction[],
  newEntryId: NewEntryId,
) {
  const tagsChanged = !sameSet(before.tagIds, after.tagIds);
  const moneyChanged = !sameEntries(before.entries, after.entries);
  const changes: { id: string; patch: TransactionPatch }[] = [];
  for (const row of rows) {
    if (row.kind !== after.kind) continue;
    const target = templatePatch(after, row, newEntryId);
    const patch: TransactionPatch = {};
    for (const field of LABEL_FIELDS) {
      if (before[field] !== after[field] && row[field] !== target[field]) {
        Object.assign(patch, { [field]: target[field] });
      }
    }
    if (tagsChanged && !sameSet(row.tagIds, target.tagIds)) {
      patch.tagIds = target.tagIds;
    }
    if (moneyChanged && !sameEntries(row.entries, target.entries)) {
      patch.entries = target.entries;
    }
    if (Object.keys(patch).length > 0) changes.push({ id: row.id, patch });
  }
  return changes;
}
