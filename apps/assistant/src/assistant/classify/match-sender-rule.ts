import type { SenderRule } from "./types.ts";

/**
 * The confirmed sender rule for a sender: a rule for the whole address wins,
 * then the rule for the longest matching domain. A domain also matches its
 * subdomains.
 */
export function matchSenderRule(
  fromAddress: string | null,
  rules: readonly SenderRule[],
): SenderRule | null {
  if (!fromAddress) return null;
  const address = fromAddress.toLowerCase();
  const domain = address.slice(address.lastIndexOf("@") + 1);
  let best: SenderRule | null = null;
  for (const rule of rules) {
    if (rule.match === "address") {
      if (rule.pattern === address) return rule;
      continue;
    }
    const matches =
      domain === rule.pattern || domain.endsWith(`.${rule.pattern}`);
    if (matches && (!best || rule.pattern.length > best.pattern.length)) {
      best = rule;
    }
  }
  return best;
}
