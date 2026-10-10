import type { RuleTemplate } from "../rules/rule-template-schema.ts";

/**
 * The template with a new size, `amount` > 0 minor units: an expense
 * spends it, an income earns it, a transfer moves it from the first account
 * to the second. Null when the template's Entries are not that simple shape
 * (several accounts, or an account in another currency), so the amount is
 * edited on a Transaction instead.
 */
export function withTemplateAmount(
  template: RuleTemplate,
  amount: number,
  isBaseCurrency: (accountId: string) => boolean,
): RuleTemplate | null {
  if (!template.entries.every((entry) => isBaseCurrency(entry.accountId))) {
    return null;
  }
  if (template.kind === "transfer") {
    const from = template.entries.at(0);
    const to = template.entries.at(1);
    if (template.entries.length !== 2 || !from || !to) return null;
    return {
      ...template,
      amountMinor: 0,
      entries: [
        { ...from, amountMinor: -amount },
        { ...to, amountMinor: amount },
      ],
    };
  }
  if (template.entries.length !== 1) return null;
  const signed = template.kind === "expense" ? -amount : amount;
  return {
    ...template,
    amountMinor: signed,
    entries: [{ ...template.entries[0], amountMinor: signed }],
  };
}

/** The size of a template's movement, always positive. */
export function templateAmount(template: RuleTemplate): number {
  if (template.kind === "transfer") {
    return Math.abs(template.entries[0]?.amountMinor ?? 0);
  }
  return Math.abs(template.amountMinor);
}
