import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import type { WriteScope } from "../db/repositories/types.ts";
import { learnPayeeFromBankTexts } from "./learn-payee-from-bank-texts.ts";

/**
 * Step 4 of the labelling pipeline. After a person confirms or corrects a
 * Transaction that bank rows match, each row's normalised text becomes an
 * alias of the Payee, and the Payee's default Category follows the most
 * common Category of its last 20 Transactions. The next time, step 1 finds
 * the Payee with no model. Does nothing when no bank row matches.
 */
export async function learnFromBankTransaction(
  scope: WriteScope,
  transactionId: string,
  payeeId: string,
) {
  const rows = await bankTransactionRepository.findByTransactionId(
    scope,
    transactionId,
  );
  await learnPayeeFromBankTexts(
    scope,
    payeeId,
    rows.map((row) => row.merchant || row.description),
  );
}
