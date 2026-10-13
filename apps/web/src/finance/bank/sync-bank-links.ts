import { accountRepository } from "../db/repositories/account-repository.ts";
import {
  bankLinkRepository,
  type BankLinkRecord,
} from "../db/repositories/bank-link-repository.ts";
import {
  bankTransactionRepository,
  type BankTransactionRecord,
} from "../db/repositories/bank-transaction-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import {
  runServerWrite,
  type ServerWriteContext,
} from "../sync/run-server-write.ts";
import { balanceDifferenceOf } from "./balance-difference-of.ts";
import { byBankDate } from "./by-bank-date.ts";
import { isUsableBankRow } from "./is-usable-bank-row.ts";
import { BankError } from "./lunchflow/bank-error.ts";
import type {
  BankClient,
  BankErrorKind,
  ProviderBalance,
  ProviderTransaction,
} from "./lunchflow/types.ts";
import { matchBankRows, type MatchLink } from "./match-bank-rows.ts";
import { toEntryAmount } from "./to-entry-amount.ts";
import type { BankLinkSyncSummary } from "./types.ts";

/** How far back the first sync of a link reads. */
const FIRST_SYNC_DAYS = 90;
/** How far before the last sync day a later sync reads again, for late-posting rows. */
const SYNC_OVERLAP_DAYS = 10;
/**
 * When the bank returns fewer than this share of the stored rows of the
 * window, the answer is taken as incomplete and no row is flagged missing.
 */
const SHORT_ANSWER_SHARE = 0.5;

interface SyncBankLinksDependencies {
  db: FinanceDb;
  householdId: string;
  client: BankClient;
  now: Date;
  /** Links synced or tried after this time are left out, so a cron does not pull again what a manual sync just pulled. */
  skipSyncedAfter?: Date;
}

type Link = BankLinkRecord & MatchLink;

interface Fetched {
  from: string;
  rows: ProviderTransaction[];
  balance: ProviderBalance;
}

/**
 * Flags stored rows the bank stopped returning, and takes back rows that
 * returned. A row is flagged only when the bank left it out of two answers
 * in a row and the answer is not short, so one bad answer flags nothing. A
 * returned row clears the Review that its flag set, when nothing else
 * changed the Transaction since.
 */
async function flagMissing(
  context: ServerWriteContext,
  link: Link,
  stored: readonly BankTransactionRecord[],
  fetched: Fetched,
  previousAnswerAt: number,
) {
  const returned = new Set(fetched.rows.map((row) => row.id));
  const window = stored.filter(
    (row) =>
      row.date >= fetched.from &&
      (row.state === "new" || row.state === "matched"),
  );
  const returnedInWindow = window.filter((row) =>
    returned.has(row.providerTxId),
  ).length;
  const gone =
    returnedInWindow < window.length * SHORT_ANSWER_SHARE
      ? []
      : window.filter(
          (row) =>
            !returned.has(row.providerTxId) &&
            row.lastSeenAt.getTime() < previousAnswerAt,
        );
  await bankTransactionRepository.setState(
    context.scope,
    gone.map((row) => row.id),
    "missing",
  );
  for (const row of gone) {
    if (row.transactionId === null) continue;
    const transaction = await transactionRepository.findById(
      context.scope,
      row.transactionId,
    );
    if (transaction && !transaction.deletedAt && !transaction.needsReview) {
      await transactionRepository.patch(context.scope, transaction.id, {
        needsReview: true,
      });
      context.markWritten();
    }
  }

  const back = stored.filter(
    (row) => row.state === "missing" && returned.has(row.providerTxId),
  );
  for (const row of back) {
    if (row.transactionId === null) continue;
    const transaction = await transactionRepository.findById(
      context.scope,
      row.transactionId,
    );
    if (transaction?.needsReview && transaction.version === row.version) {
      await transactionRepository.patch(context.scope, transaction.id, {
        needsReview: false,
      });
      context.markWritten();
    }
  }
  await bankTransactionRepository.setState(
    context.scope,
    back.filter((row) => row.transactionId !== null).map((row) => row.id),
    "matched",
  );
  await bankTransactionRepository.setState(
    context.scope,
    back.filter((row) => row.transactionId === null).map((row) => row.id),
    "new",
  );

  const unusable = stored.filter(
    (row) =>
      row.state === "new" &&
      returned.has(row.providerTxId) &&
      !isUsableBankRow(row, link),
  );
  await bankTransactionRepository.setState(
    context.scope,
    unusable.map((row) => row.id),
    "ignored",
  );
  return gone.length;
}

async function writeLink(
  context: ServerWriteContext,
  link: Link,
  fetched: Fetched,
  now: Date,
): Promise<Omit<BankLinkSyncSummary, "linkId" | "accountId" | "error">> {
  const { scope, today } = context;
  const account = await accountRepository.findById(scope, link.accountId);
  if (!account || account.deletedAt) {
    throw new Error("The linked account is gone");
  }

  const previousAnswerAt = (
    await bankTransactionRepository.listForLink(scope, link.id)
  ).reduce((latest, row) => Math.max(latest, row.lastSeenAt.getTime()), 0);
  await bankTransactionRepository.upsert(scope, link.id, fetched.rows, now);
  const stored = await bankTransactionRepository.listForLink(scope, link.id);
  const missing = await flagMissing(
    context,
    link,
    stored,
    fetched,
    previousAnswerAt,
  );

  const open = byBankDate(
    (await bankTransactionRepository.listForLink(scope, link.id)).filter(
      (row) => row.state === "new" && isUsableBankRow(row, link),
    ),
  );
  const { matchedIds, linked, confirmed } = await matchBankRows(
    context,
    link,
    open,
  );
  const pending = open.length - matchedIds.size;

  const bankBalance = toEntryAmount(fetched.balance.amountMinor, link);
  await bankLinkRepository.recordBalance(scope, {
    linkId: link.id,
    fetchedAt: now,
    amountMinor: fetched.balance.amountMinor,
    currency: fetched.balance.currency,
  });
  const balanceDifferenceMinor =
    pending === 0 && fetched.balance.currency === link.currency
      ? balanceDifferenceOf(
          bankBalance,
          await valuationRepository.balanceAt(scope, link.accountId, today),
        )
      : null;
  await bankLinkRepository.patch(scope, link.id, {
    lastSyncedOn: today,
    lastSyncAt: now,
    lastError: null,
    status: "active",
    bankBalanceMinor:
      fetched.balance.currency === link.currency ? bankBalance : null,
    bankBalanceOn: today,
    balanceDifferenceMinor,
  });
  context.markWritten();
  return {
    pending,
    linked,
    confirmed,
    missing,
    balanceDifferenceMinor,
  };
}

async function recordError(
  dependencies: SyncBankLinksDependencies,
  link: Link,
  kind: BankErrorKind | "failed",
) {
  await runServerWrite(
    dependencies.db,
    dependencies.householdId,
    dependencies.now,
    async (context) => {
      await bankLinkRepository.patch(context.scope, link.id, {
        lastError: kind,
        lastSyncAt: dependencies.now,
        status:
          kind === "reconnect" || kind === "auth" || kind === "not_found"
            ? "reconnect"
            : link.status,
      });
      context.markWritten();
    },
  );
}

async function syncLink(
  dependencies: SyncBankLinksDependencies,
  link: Link,
  today: string,
): Promise<BankLinkSyncSummary> {
  const from = link.lastSyncedOn
    ? addDays(link.lastSyncedOn, -SYNC_OVERLAP_DAYS)
    : addDays(today, -FIRST_SYNC_DAYS);
  const [rows, balance] = await Promise.allSettled([
    dependencies.client.listTransactions(link.providerAccountId, { from }),
    dependencies.client.getBalance(link.providerAccountId),
  ]);
  if (rows.status === "rejected") throw rows.reason;
  if (balance.status === "rejected") throw balance.reason;
  const fetched: Fetched = { from, rows: rows.value, balance: balance.value };
  const { result } = await runServerWrite(
    dependencies.db,
    dependencies.householdId,
    dependencies.now,
    (context) => writeLink(context, link, fetched, dependencies.now),
  );
  return { linkId: link.id, accountId: link.accountId, error: null, ...result };
}

/**
 * Syncs every live Bank link of a Household (design §7.3): reads the bank
 * rows since the last sync day less ten days (the first time, the last 90
 * days), stores them, flags rows the bank no longer returns, matches new
 * rows to Transactions already in the ledger, and compares the balances
 * when no row of the link waits for the AI step. A row without a match
 * stays `new` for `processBankRows` to label. A failing link records its error and the others go
 * on. Running it again with the same bank data changes no Transaction.
 */
export async function syncBankLinks(
  dependencies: SyncBankLinksDependencies,
): Promise<BankLinkSyncSummary[]> {
  const { db, householdId } = dependencies;
  const { household, links } = await withHousehold(
    db,
    householdId,
    async (scope) => {
      const inTransitIds = await accountRepository.listSystemIds(scope);
      return {
        household: await householdRepository.find(scope),
        links: (await bankLinkRepository.listLive(scope)).map((link) => ({
          ...link,
          inTransitAccountId: inTransitIds.get(link.currency) ?? null,
        })),
      };
    },
  );
  if (!household) throw new Error("Household not found");
  const today = todayInTimeZone(household.timezone, dependencies.now);
  const results: BankLinkSyncSummary[] = [];
  const skipAfter = dependencies.skipSyncedAfter?.getTime();
  for (const link of links) {
    if (
      skipAfter !== undefined &&
      link.lastSyncAt !== null &&
      link.lastSyncAt.getTime() > skipAfter
    ) {
      continue;
    }
    try {
      results.push(await syncLink(dependencies, link, today));
    } catch (error) {
      const kind = error instanceof BankError ? error.kind : "failed";
      if (kind === "failed") console.error("Bank sync failed", error);
      await recordError(dependencies, link, kind);
      results.push({
        linkId: link.id,
        accountId: link.accountId,
        error: kind,
        pending: 0,
        linked: 0,
        confirmed: 0,
        missing: 0,
        balanceDifferenceMinor: link.balanceDifferenceMinor,
      });
    }
  }
  return results;
}
