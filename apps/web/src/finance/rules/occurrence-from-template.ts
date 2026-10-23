import type { RuleTemplate } from "./rule-template-schema.ts";

/**
 * The fields, Entries and Tags of a Rule's Transaction made from `template`.
 * `entryId` names the Entry at each position.
 */
export function occurrenceFromTemplate(
  template: RuleTemplate,
  entryId: (position: number) => string,
) {
  return {
    kind: template.kind,
    amountMinor: template.amountMinor,
    categoryId: template.categoryId,
    payeeId: template.payeeId,
    memberId: template.memberId,
    note: template.note,
    entries: template.entries.map((entry, position) => ({
      id: entryId(position),
      accountId: entry.accountId,
      amountMinor: entry.amountMinor,
    })),
    tagIds: [...new Set(template.tagIds)],
  };
}
