import { bankKeptTransactionRepository } from "../db/repositories/bank-kept-transaction-repository.ts";
import {
  bankLinkRepository,
  type BankLinkPatch,
} from "../db/repositories/bank-link-repository.ts";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";
import { isUsableBankRow } from "./is-usable-bank-row.ts";
import type { ProviderBalance } from "./lunchflow/types.ts";
import { toEntryAmount } from "./to-entry-amount.ts";

/** A posted Entry behind a balance check's difference that no bank row backs. */
interface UnbackedEntry {
  id: string;
  transactionId: string;
  date: string;
}

/** A Bank link that is gone, or a Transaction that is not unbacked on the link. */
export class BalanceCheckNotFoundError extends Error {}

interface FetchedBankBalance {
  linkId: string;
  fetchedAt: Date;
  balance: ProviderBalance;
}

interface BackingRow {
  date: string;
  state: "new" | "matched" | "missing" | "ignored";
  transactionId: string | null;
}

/**
 * Marks each live link whose usable `new` bank rows wait for the AI step, as
 * its ledger is not complete while they wait, and returns how many wait on
 * each. Given a `fetched` bank balance, it does this for that link only, and
 * stores the balance on it with the link's sign, dated today, and keeps it in
 * the balance history; null when the bank answers in another currency. A link
 * is written only when something changed.
 */
async function refresh(
  context: ServerWriteContext,
  fetched?: FetchedBankBalance,
): Promise<ReadonlyMap<string, number>> {
  const { scope, today } = context;
  const links = (await bankLinkRepository.listLive(scope)).filter(
    (link) => !fetched || link.id === fetched.linkId,
  );
  const open = await bankTransactionRepository.listOpen(
    scope,
    links.map((link) => link.id),
  );
  const waitingByLink = new Map<string, number>();
  for (const link of links) {
    const waiting = open.filter(
      (row) => row.linkId === link.id && isUsableBankRow(row, link),
    ).length;
    waitingByLink.set(link.id, waiting);

    const fields: BankLinkPatch = {};
    const isWaiting = waiting > 0;
    if (isWaiting !== link.bankRowsWaiting) fields.bankRowsWaiting = isWaiting;
    if (fetched) {
      const { balance } = fetched;
      await bankLinkRepository.recordBalance(scope, {
        linkId: link.id,
        fetchedAt: fetched.fetchedAt,
        amountMinor: balance.amountMinor,
        currency: balance.currency,
      });
      const bankBalanceMinor =
        balance.currency === link.currency
          ? toEntryAmount(balance.amountMinor, link)
          : null;
      if (bankBalanceMinor !== link.bankBalanceMinor) {
        fields.bankBalanceMinor = bankBalanceMinor;
      }
      if (link.bankBalanceOn !== today) fields.bankBalanceOn = today;
    }
    if (Object.keys(fields).length === 0) continue;
    await bankLinkRepository.patch(scope, link.id, fields);
    context.markWritten();
  }
  return waitingByLink;
}

/**
 * Of `entries`, those dated within the bank history of the link that no
 * matched bank row of the link backs and no Member kept. Each is a payment
 * the bank has not posted yet, a duplicate, or a real payment the bank left
 * out. Oldest first: the bank has had longest to post an old one, so it is
 * the likelier duplicate.
 */
function selectUnbackedEntries(
  entries: readonly UnbackedEntry[],
  bankRows: readonly BackingRow[],
  keptTransactionIds: readonly string[],
): UnbackedEntry[] {
  if (bankRows.length === 0) return [];
  const historyFrom = bankRows.reduce(
    (earliest, row) => (row.date < earliest ? row.date : earliest),
    bankRows[0].date,
  );
  const backed = new Set([
    ...keptTransactionIds,
    ...bankRows.flatMap((row) =>
      row.state === "matched" && row.transactionId !== null
        ? [row.transactionId]
        : [],
    ),
  ]);
  return entries
    .filter(
      (entry) => entry.date >= historyFrom && !backed.has(entry.transactionId),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function findLiveLink(scope: RepositoryScope, linkId: string) {
  const link = await bankLinkRepository.findById(scope, linkId);
  if (!link || link.deletedAt) {
    throw new BalanceCheckNotFoundError("The Bank link is gone");
  }
  return link;
}

/**
 * The Entries behind the link's balance difference: the posted Entries
 * after the latest Valuation on or before the bank balance's day, up to that
 * day, that no matched bank row backs and no Member kept. Oldest first.
 */
async function unbackedEntries(
  scope: RepositoryScope,
  linkId: string,
): Promise<UnbackedEntry[]> {
  const link = await findLiveLink(scope, linkId);
  if (link.bankBalanceOn === null) return [];
  const latest = await valuationRepository.latestOnOrBefore(
    scope,
    link.accountId,
    link.bankBalanceOn,
  );
  return selectUnbackedEntries(
    await valuationRepository.postedEntriesAfter(
      scope,
      link.accountId,
      latest?.on ?? null,
      link.bankBalanceOn,
    ),
    await bankTransactionRepository.listBacking(scope, link.id),
    await bankKeptTransactionRepository.listIds(scope, link.id),
  );
}

/**
 * A Member keeps an unbacked Transaction, a real payment the bank left out,
 * so the balance check stops listing it. The link takes a new version, so
 * every client reads the list again.
 */
async function keep(
  context: ServerWriteContext,
  linkId: string,
  transactionId: string,
) {
  const unbacked = await unbackedEntries(context.scope, linkId);
  if (!unbacked.some((entry) => entry.transactionId === transactionId)) {
    throw new BalanceCheckNotFoundError("The Transaction is not unbacked");
  }
  await bankKeptTransactionRepository.keep(
    context.scope,
    linkId,
    transactionId,
  );
  await bankLinkRepository.patch(context.scope, linkId, {});
  context.markWritten();
}

/** Undoes `keep`. */
async function unkeep(
  context: ServerWriteContext,
  linkId: string,
  transactionId: string,
) {
  await findLiveLink(context.scope, linkId);
  await bankKeptTransactionRepository.unkeep(
    context.scope,
    linkId,
    transactionId,
  );
  await bankLinkRepository.patch(context.scope, linkId, {});
  context.markWritten();
}

/**
 * The server side of the balance check: the bank balance and whether bank
 * rows wait on each Bank link, and the Entries behind a difference. The
 * client compares the balances itself, from the Replica.
 */
export const balanceCheck = { refresh, unbackedEntries, keep, unkeep };
