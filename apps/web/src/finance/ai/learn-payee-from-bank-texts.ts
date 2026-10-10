import { payeeRepository } from "../db/repositories/payee-repository.ts";
import type { WriteScope } from "../db/repositories/types.ts";
import { CATEGORY_HISTORY } from "./labels-for-payee.ts";
import { modeOf } from "./mode-of.ts";
import { normaliseBankText } from "./normalise-bank-text.ts";

/**
 * Step 4 of the labelling pipeline for one Payee: each bank text becomes an
 * alias of the Payee in its normalised form, and the Payee's default Category
 * follows the most common Category of its last 20 Transactions.
 */
export async function learnPayeeFromBankTexts(
  scope: WriteScope,
  payeeId: string,
  texts: readonly string[],
) {
  if (texts.length === 0) return;
  const aliases = texts
    .map((text) => normaliseBankText(text))
    .filter((alias) => alias !== "");
  await payeeRepository.putAliases(scope, payeeId, aliases);

  const payee = await payeeRepository.findById(scope, payeeId);
  if (!payee || payee.deletedAt) return;
  const mode = modeOf(
    await payeeRepository.recentCategoryIds(scope, payeeId, CATEGORY_HISTORY),
  );
  if (mode !== undefined && mode !== payee.defaultCategoryId) {
    await payeeRepository.patch(scope, payeeId, { defaultCategoryId: mode });
  }
}
