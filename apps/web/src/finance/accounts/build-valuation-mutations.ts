import type { AccountKind } from "../domain/accounts/side-of-kind.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { valuationChange, type ValuationChange } from "./valuation-change.ts";
import { valuationInputSign } from "./valuation-input-sign.ts";

export interface ValuationField {
  accountId: string;
  kind: AccountKind;
  currency: string;
  /** The stored balance at the end of the update's day. */
  current: number;
}

interface PutValuationArgs {
  id: string;
  accountId: string;
  on: string;
  amountMinor: number;
}

interface ValuationMutations {
  valuations: PutValuationArgs[];
  /** Fields whose text is not an amount; nothing is written for them. */
  invalid: string[];
  /** The change of each written field, as the field shows it (owed as positive). */
  changes: Map<string, ValuationChange>;
  /** Written fields that move more than `LARGE_CHANGE_SHARE` from the last value. */
  large: string[];
}

/**
 * The `putValuation` arguments for every field whose typed amount differs
 * from the balance that day. An empty or unchanged field is skipped, so
 * confirming a value costs nothing.
 */
export function buildValuationMutations(
  fields: readonly ValuationField[],
  inputs: ReadonlyMap<string, string>,
  day: string,
  createId: () => string = () => crypto.randomUUID(),
): ValuationMutations {
  const valuations: PutValuationArgs[] = [];
  const invalid: string[] = [];
  const changes = new Map<string, ValuationChange>();
  const large: string[] = [];
  for (const field of fields) {
    const text = inputs.get(field.accountId)?.trim() ?? "";
    if (text === "") continue;
    const typed = parseMoney(text, field.currency);
    if (typed === null) {
      invalid.push(field.accountId);
      continue;
    }
    const sign = valuationInputSign(field.kind);
    const amountMinor = typed * sign || 0;
    if (amountMinor === field.current) continue;
    const change = valuationChange(field.current * sign, typed);
    changes.set(field.accountId, change);
    if (change.isLarge) large.push(field.accountId);
    valuations.push({
      id: createId(),
      accountId: field.accountId,
      on: day,
      amountMinor,
    });
  }
  return { valuations, invalid, changes, large };
}
