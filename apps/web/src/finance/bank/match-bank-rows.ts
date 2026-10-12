import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import { addDays } from "../domain/dates/add-days.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";
import { transactionMutations } from "../sync/transaction-mutations.ts";
import { MATCH_DAY_WINDOW, planBankMatches } from "./plan-bank-matches.ts";
import { toEntryAmount } from "./to-entry-amount.ts";

/** A Bank link as the matcher needs it. */
export interface MatchLink {
  id: string;
  accountId: string;
  signMultiplier: number;
  /** The In transit account in the link's currency, when there is one. */
  inTransitAccountId: string | null;
}

interface OpenRow {
  id: string;
  date: string;
  /** As the bank sent it, before the link's sign multiplier. */
  amountMinor: number;
}

function candidateRange(rows: readonly { date: string }[]) {
  const dates = rows.map((row) => row.date).sort();
  return {
    from: addDays(dates[0], -MATCH_DAY_WINDOW),
    to: addDays(dates[dates.length - 1], MATCH_DAY_WINDOW),
  };
}

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
  const current = await transactionRepository.findEntries(
    context.scope,
    transactionId,
  );
  await transactionMutations.update(context, transactionId, {
    entries: current.map((entry) => ({
      id: entry.id,
      accountId: entry.id === entryId ? link.accountId : entry.accountId,
      amountMinor: entry.amountMinor,
      fxRate: entry.fxRate,
    })),
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
  rows: readonly OpenRow[],
): Promise<{ matchedIds: Set<string>; linked: number; confirmed: number }> {
  const result = { matchedIds: new Set<string>(), linked: 0, confirmed: 0 };
  if (rows.length === 0) return result;
  const { scope } = context;
  const candidates = await bankTransactionRepository.findMatchCandidates(
    scope,
    link.id,
    link.accountId,
    candidateRange(rows),
    link.inTransitAccountId,
  );
  if (candidates.length === 0) return result;
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.transactionId, candidate]),
  );
  const plan = planBankMatches(
    rows.map((row) => ({
      date: row.date,
      amountMinor: toEntryAmount(row.amountMinor, link),
    })),
    candidates,
  );
  const matched: { id: string; transactionId: string }[] = [];
  for (const [index, row] of rows.entries()) {
    const match = plan[index];
    if (match.action === "create") continue;
    const candidate = candidateById.get(match.transactionId);
    if (!candidate) continue;
    if (match.action === "settle") {
      await settle(context, link, match.transactionId, match.entryId);
      result.linked++;
    } else if (match.action === "confirm") {
      await transactionMutations.confirmExpected(
        context,
        candidate.transactionId,
        candidate.transactionDate === row.date ? undefined : { date: row.date },
      );
      result.confirmed++;
    } else {
      result.linked++;
    }
    matched.push({ id: row.id, transactionId: candidate.transactionId });
    result.matchedIds.add(row.id);
  }
  await bankTransactionRepository.setMatched(scope, matched);
  if (matched.length > 0) context.markWritten();
  return result;
}
