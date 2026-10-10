import type { LanguageModel } from "ai";
import { learnPayeeFromBankTexts } from "../ai/learn-payee-from-bank-texts.ts";
import { suggestLabelsBatch } from "../ai/suggest-labels-batch.ts";
import type { ModelLabelInput } from "../ai/suggest-labels-with-model.ts";
import type { LabelMemory, Suggestion } from "../ai/types.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import {
  bankLinkRepository,
  type BankLinkRecord,
} from "../db/repositories/bank-link-repository.ts";
import {
  bankTransactionRepository,
  type BankTransactionRecord,
  type MatchCandidateRow,
} from "../db/repositories/bank-transaction-repository.ts";
import { fxRateRepository } from "../db/repositories/fx-rate-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { labelMemoryRepository } from "../db/repositories/label-memory-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import {
  runServerWrite,
  type ServerWriteContext,
} from "../sync/run-server-write.ts";
import { transactionMutations } from "../sync/transaction-mutations.ts";
import { createBankTransaction } from "./create-bank-transaction.ts";
import { BankError } from "./lunchflow/bank-error.ts";
import type {
  BankClient,
  BankErrorKind,
  ProviderBalance,
  ProviderTransaction,
} from "./lunchflow/types.ts";
import {
  MATCH_DAY_WINDOW,
  matchBankTransaction,
  type MatchCandidate,
} from "./match-bank-transaction.ts";
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
  /** Null when no model is set up: bank rows are labelled from memory only. */
  model: LanguageModel | null;
  now: Date;
  onModelError?: (error: unknown) => void;
  /** Links synced or tried after this time are left out, so a cron does not pull again what a manual sync just pulled. */
  skipSyncedAfter?: Date;
}

type Link = BankLinkRecord;

interface Fetched {
  from: string;
  rows: ProviderTransaction[];
  balance: ProviderBalance;
}

function bankText(row: { merchant: string; description: string }) {
  return row.merchant || row.description;
}

function isUsable(row: { currency: string; amountMinor: number }, link: Link) {
  return row.currency === link.currency && row.amountMinor !== 0;
}

function toCandidates(rows: readonly MatchCandidateRow[]): MatchCandidate[] {
  return rows.map((row) => ({
    transactionId: row.transactionId,
    status: row.status,
    date: row.date,
    amountMinor: row.amountMinor,
    createdAt: row.createdAt,
  }));
}

function candidateRange(rows: readonly { date: string }[]) {
  const dates = rows.map((row) => row.date).sort();
  return {
    from: addDays(dates[0], -MATCH_DAY_WINDOW),
    to: addDays(dates[dates.length - 1], MATCH_DAY_WINDOW),
  };
}

/** Plays the matcher over `rows` in date order; each Transaction matches at most one row. */
function planMatches(
  rows: readonly { date: string; amountMinor: number }[],
  candidates: MatchCandidate[],
  link: Link,
) {
  const open = [...candidates];
  return rows.map((row) => {
    const match = matchBankTransaction(
      { date: row.date, amountMinor: toEntryAmount(row.amountMinor, link) },
      open,
    );
    if (match.action !== "create") {
      open.splice(
        open.findIndex(
          (candidate) => candidate.transactionId === match.transactionId,
        ),
        1,
      );
    }
    return match;
  });
}

function byDate<Row extends { date: string; providerTxId: string }>(
  rows: readonly Row[],
) {
  return [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.providerTxId.localeCompare(b.providerTxId),
  );
}

/**
 * Whether a returned bank row will be matched or get a Transaction in this
 * sync: a row not stored yet, a `new` row, or a `missing` row without a
 * Transaction, which `flagMissing` makes `new` again.
 */
function willBeOpen(stored: BankTransactionRecord | undefined) {
  return (
    !stored ||
    stored.state === "new" ||
    (stored.state === "missing" && stored.transactionId === null)
  );
}

/** Reads the rows that will need new Transactions and labels them, before any lock is taken. */
async function labelRows(
  dependencies: SyncBankLinksDependencies,
  scope: RepositoryScope,
  link: Link,
  fetched: Fetched,
  loadMemory: () => Promise<LabelMemory>,
): Promise<Map<string, Suggestion>> {
  const known = new Map(
    (await bankTransactionRepository.listForLink(scope, link.id)).map((row) => [
      row.providerTxId,
      row,
    ]),
  );
  const open = byDate(
    fetched.rows
      .map((row) => ({ ...row, providerTxId: row.id }))
      .filter((row) => isUsable(row, link) && willBeOpen(known.get(row.id))),
  );
  if (open.length === 0) return new Map();
  const candidates = toCandidates(
    await bankTransactionRepository.findMatchCandidates(
      scope,
      link.id,
      link.accountId,
      candidateRange(open),
    ),
  );
  const plan = planMatches(open, candidates, link);
  const inputs: ModelLabelInput[] = open
    .filter((_, index) => plan[index].action === "create")
    .map((row) => ({
      key: row.id,
      text: bankText(row),
      amountMinor: toEntryAmount(row.amountMinor, link),
      date: row.date,
      accountId: link.accountId,
    }));
  if (inputs.length === 0) return new Map();
  return suggestLabelsBatch(await loadMemory(), inputs, {
    model: dependencies.model,
    onModelError: dependencies.onModelError,
  });
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
      !isUsable(row, link),
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
  suggestions: Map<string, Suggestion>,
  now: Date,
): Promise<Omit<BankLinkSyncSummary, "linkId" | "accountId" | "error">> {
  const { scope, today } = context;
  const account = await accountRepository.findById(scope, link.accountId);
  if (!account || account.deletedAt) {
    throw new Error("The linked account is gone");
  }
  const counts = { created: 0, linked: 0, confirmed: 0, missing: 0 };

  const previousAnswerAt = (
    await bankTransactionRepository.listForLink(scope, link.id)
  ).reduce((latest, row) => Math.max(latest, row.lastSeenAt.getTime()), 0);
  await bankTransactionRepository.upsert(scope, link.id, fetched.rows, now);
  const stored = await bankTransactionRepository.listForLink(scope, link.id);
  counts.missing = await flagMissing(
    context,
    link,
    stored,
    fetched,
    previousAnswerAt,
  );

  const open = byDate(
    (await bankTransactionRepository.listForLink(scope, link.id)).filter(
      (row) => row.state === "new" && isUsable(row, link),
    ),
  );
  if (open.length > 0) {
    const candidates = await bankTransactionRepository.findMatchCandidates(
      scope,
      link.id,
      link.accountId,
      candidateRange(open),
    );
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.transactionId, candidate]),
    );
    const plan = planMatches(open, toCandidates(candidates), link);
    const fx = createFxIndex(
      await fxRateRepository.list(scope),
      context.household.baseCurrency,
    );
    const matched: { id: string; transactionId: string }[] = [];
    const textsByPayee = new Map<string, string[]>();

    for (const [index, row] of open.entries()) {
      const match = plan[index];
      if (match.action === "create") {
        const transactionId = await createBankTransaction(
          context,
          {
            linkId: link.id,
            providerTxId: row.providerTxId,
            date: row.date,
            amountMinor: toEntryAmount(row.amountMinor, link),
            text: bankText(row),
            note: row.description || row.merchant,
          },
          account,
          suggestions.get(row.providerTxId),
          fx,
        );
        matched.push({ id: row.id, transactionId });
        counts.created++;
        continue;
      }

      const candidate = candidateById.get(match.transactionId);
      if (!candidate) continue;
      if (match.action === "confirm") {
        await transactionMutations.confirmExpected(
          context,
          candidate.transactionId,
          candidate.transactionDate === row.date
            ? undefined
            : { date: row.date },
        );
        counts.confirmed++;
      } else {
        counts.linked++;
      }
      matched.push({ id: row.id, transactionId: candidate.transactionId });
      if (candidate.payeeId !== null) {
        const texts = textsByPayee.get(candidate.payeeId) ?? [];
        texts.push(bankText(row));
        textsByPayee.set(candidate.payeeId, texts);
      }
    }

    await bankTransactionRepository.setMatched(scope, matched);
    for (const [payeeId, texts] of textsByPayee) {
      await learnPayeeFromBankTexts(scope, payeeId, texts);
    }
  }

  const bankBalance = toEntryAmount(fetched.balance.amountMinor, link);
  await bankLinkRepository.recordBalance(scope, {
    linkId: link.id,
    fetchedAt: now,
    amountMinor: fetched.balance.amountMinor,
    currency: fetched.balance.currency,
  });
  const ours = await valuationRepository.balanceAt(
    scope,
    link.accountId,
    today,
  );
  const difference =
    fetched.balance.currency === link.currency ? bankBalance - ours : 0;
  const balanceDifferenceMinor = difference === 0 ? null : difference;
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
  return { ...counts, balanceDifferenceMinor };
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
  loadMemory: () => Promise<LabelMemory>,
): Promise<BankLinkSyncSummary> {
  const scope = { db: dependencies.db, householdId: dependencies.householdId };
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
  const suggestions = await labelRows(
    dependencies,
    scope,
    link,
    fetched,
    loadMemory,
  );
  const { result } = await runServerWrite(
    dependencies.db,
    dependencies.householdId,
    dependencies.now,
    (context) =>
      writeLink(context, link, fetched, suggestions, dependencies.now),
  );
  return { linkId: link.id, accountId: link.accountId, error: null, ...result };
}

/**
 * Syncs every live Bank link of a Household (design §7.3): reads the bank
 * rows since the last sync day less ten days (the first time, the last 90
 * days), stores them, flags rows the bank no longer returns, matches new
 * rows to Expected or manual Transactions or creates labelled ones, and
 * compares the balances. A failing link records its error and the others go
 * on. Running it again with the same bank data changes no Transaction.
 */
export async function syncBankLinks(
  dependencies: SyncBankLinksDependencies,
): Promise<BankLinkSyncSummary[]> {
  const scope = { db: dependencies.db, householdId: dependencies.householdId };
  const household = await householdRepository.find(scope);
  if (!household) throw new Error("Household not found");
  const today = todayInTimeZone(household.timezone, dependencies.now);
  let memory: Promise<LabelMemory> | undefined;
  const loadMemory = () => {
    memory ??= labelMemoryRepository.load(scope).catch((error: unknown) => {
      memory = undefined;
      throw error;
    });
    return memory;
  };
  const results: BankLinkSyncSummary[] = [];
  const skipAfter = dependencies.skipSyncedAfter?.getTime();
  for (const link of await bankLinkRepository.listLive(scope)) {
    if (
      skipAfter !== undefined &&
      link.lastSyncAt !== null &&
      link.lastSyncAt.getTime() > skipAfter
    ) {
      continue;
    }
    try {
      results.push(await syncLink(dependencies, link, today, loadMemory));
    } catch (error) {
      const kind = error instanceof BankError ? error.kind : "failed";
      if (kind === "failed") console.error("Bank sync failed", error);
      await recordError(dependencies, link, kind);
      results.push({
        linkId: link.id,
        accountId: link.accountId,
        error: kind,
        created: 0,
        linked: 0,
        confirmed: 0,
        missing: 0,
        balanceDifferenceMinor: link.balanceDifferenceMinor,
      });
    }
  }
  return results;
}
