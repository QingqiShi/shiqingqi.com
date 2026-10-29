import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import {
  reconciliation,
  type MatchLink,
  type OpenBankRow,
} from "../reconciliation/reconciliation.ts";
import { applyMutation } from "../sync/apply-mutation.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";

/**
 * Moves the In transit Entry of a Transaction to the linked account: the
 * money arrived. A Review flag stays as it was, because it may hold another
 * reason to look.
 */
async function settle(
  context: ServerWriteContext,
  link: MatchLink,
  transactionId: string,
  entryId: string,
) {
  const current =
    (
      await transactionRepository.findEntriesOf(context.scope, [transactionId])
    ).get(transactionId) ?? [];
  await applyMutation(context, {
    name: "updateTransaction",
    args: {
      id: transactionId,
      patch: {
        entries: current.map((entry) => ({
          id: entry.id,
          accountId: entry.id === entryId ? link.accountId : entry.accountId,
          amountMinor: entry.amountMinor,
        })),
      },
    },
  });
}

/**
 * Matches open bank rows of one link to Transactions already in the ledger:
 * confirms an Expected one, links a recorded one, or settles an In transit
 * Entry. Rows without a match stay open.
 */
export async function matchBankRows(
  context: ServerWriteContext,
  link: MatchLink,
  rows: readonly OpenBankRow[],
): Promise<{ matchedIds: Set<string>; linked: number; confirmed: number }> {
  const result = { matchedIds: new Set<string>(), linked: 0, confirmed: 0 };
  const pairs = await reconciliation.pairBankRows(context.scope, link, rows);
  const matched: { id: string; transactionId: string }[] = [];
  for (const row of rows) {
    const pair = pairs.get(row.id);
    if (!pair) continue;
    if (pair.action === "settle") {
      await settle(context, link, pair.transactionId, pair.entryId);
      result.linked++;
    } else if (pair.action === "confirm") {
      await applyMutation(context, {
        name: "confirmExpected",
        args: {
          id: pair.transactionId,
          patch:
            pair.transactionDate === row.date ? undefined : { date: row.date },
        },
      });
      result.confirmed++;
    } else {
      result.linked++;
    }
    matched.push({ id: row.id, transactionId: pair.transactionId });
    result.matchedIds.add(row.id);
  }
  await bankTransactionRepository.setMatched(context.scope, matched);
  if (matched.length > 0) context.markWritten();
  return result;
}
