import { normaliseBankText } from "./normalise-bank-text.ts";
import type { LabelMemory } from "./types.ts";

/** The live Payee that has the bank text, in its normalised form, as an alias. */
export function matchPayee(
  text: string,
  memory: Pick<LabelMemory, "aliases" | "payees">,
): string | null {
  const normalised = normaliseBankText(text);
  if (normalised === "") return null;
  const live = new Set(memory.payees.map((payee) => payee.id));
  return (
    memory.aliases.find(
      (alias) => alias.alias === normalised && live.has(alias.payeeId),
    )?.payeeId ?? null
  );
}
