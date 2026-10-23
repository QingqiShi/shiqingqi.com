import { sameSet } from "../domain/same-set.ts";
import type { RuleTemplate } from "./rule-template-schema.ts";

interface EntryShape {
  accountId: string;
  amountMinor: number;
}

/** True when both lists move the same amounts on the same accounts, in the same order. */
export function sameEntries(
  a: readonly EntryShape[],
  b: readonly EntryShape[],
) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.accountId === b[index].accountId &&
        entry.amountMinor === b[index].amountMinor,
    )
  );
}

/** True when both templates make the same Transaction. */
export function sameTemplate(a: RuleTemplate, b: RuleTemplate) {
  return (
    a.kind === b.kind &&
    a.amountMinor === b.amountMinor &&
    a.categoryId === b.categoryId &&
    a.payeeId === b.payeeId &&
    a.memberId === b.memberId &&
    a.note === b.note &&
    sameEntries(a.entries, b.entries) &&
    sameSet(a.tagIds, b.tagIds)
  );
}
