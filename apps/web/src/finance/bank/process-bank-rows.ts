import {
  LABEL_BATCH_SIZE,
  labelBankRows,
  type LabellingModel,
  type LabelResult,
} from "../ai/label-bank-rows.ts";
import type { LabellingContext } from "../ai/types.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { labellingContextRepository } from "../db/repositories/labelling-context-repository.ts";
import { transactionSearchRepository } from "../db/repositories/transaction-search-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { balanceCheck } from "./balance-check.ts";
import { isUsableBankRow } from "./is-usable-bank-row.ts";
import { matchBankRows } from "./match-bank-rows.ts";
import { toEntryAmount } from "./to-entry-amount.ts";
import {
  MAX_LABEL_ATTEMPTS,
  writeLabelledRows,
  type BatchRow,
  type ProcessLink,
  type WriteOutcome,
} from "./write-labelled-rows.ts";

/** How long after a route starts the AI step may begin a new batch: the routes' 300 seconds, less a margin. */
const PROCESS_BUDGET_MS = 240_000;

interface ProcessBankRowsDependencies {
  db: FinanceDb;
  householdId: string;
  /** Null when no model is set up: every row is written as Uncategorised for Review. */
  model: LabellingModel | null;
  now: Date;
  /** No new batch starts after this time. Defaults to `PROCESS_BUDGET_MS` after `now`. */
  deadline?: Date;
  /** The current time, for the deadline. */
  clock?: () => Date;
  onModelError?: (error: unknown) => void;
  /** Hears why the model's answer for a row was refused. */
  onUnusableAnswer?: (problem: string) => void;
}

interface ProcessSummary {
  /** New Transactions, by the account of the bank row. */
  createdByAccount: Map<string, number>;
}

async function loadQueue(db: FinanceDb, householdId: string) {
  return withHousehold(db, householdId, async (scope) => {
    const inTransitIds = await accountRepository.listSystemIds(scope);
    const links = new Map<string, ProcessLink>();
    for (const link of await bankLinkRepository.listLive(scope)) {
      const account = await accountRepository.findById(scope, link.accountId);
      if (!account || account.deletedAt) continue;
      links.set(link.id, {
        id: link.id,
        accountId: link.accountId,
        currency: link.currency,
        signMultiplier: link.signMultiplier,
        ownerMemberId: account.ownerMemberId,
        inTransitAccountId: inTransitIds.get(link.currency) ?? null,
      });
    }
    const rows = await bankTransactionRepository.listOpen(scope, [
      ...links.keys(),
    ]);
    return rows.flatMap((row): BatchRow[] => {
      const link = links.get(row.linkId);
      return link && isUsableBankRow(row, link) ? [{ ref: "", row, link }] : [];
    });
  });
}

/** Refs the model reads: 1, 2, 3 within the batch. */
function withRefs(batch: readonly BatchRow[]) {
  return batch.map((item, index) => ({ ...item, ref: String(index + 1) }));
}

/** Links the rows that a Transaction written since the sync now matches, and keeps the rest. */
async function matchFirst(
  dependencies: ProcessBankRowsDependencies,
  batch: readonly BatchRow[],
) {
  const { result } = await runServerWrite(
    dependencies.db,
    dependencies.householdId,
    dependencies.now,
    async (context) => {
      const matched = new Set<string>();
      for (const rows of Map.groupBy(batch, (item) => item.link.id).values()) {
        const { matchedIds } = await matchBankRows(
          context,
          rows[0].link,
          rows.map((item) => item.row),
        );
        for (const id of matchedIds) matched.add(id);
      }
      return matched;
    },
  );
  return batch.filter((item) => !result.has(item.row.id));
}

async function label(
  dependencies: ProcessBankRowsDependencies,
  model: LabellingModel,
  context: LabellingContext,
  batch: readonly BatchRow[],
): Promise<Map<string, LabelResult>> {
  const { db, householdId } = dependencies;
  return labelBankRows(
    model,
    context,
    batch.map(({ ref, row, link }) => ({
      ref,
      date: row.date,
      amountMinor: toEntryAmount(row.amountMinor, link),
      accountId: link.accountId,
      merchant: row.merchant,
      description: row.description,
    })),
    (search) =>
      withHousehold(db, householdId, (scope) =>
        transactionSearchRepository.search(scope, search),
      ),
  );
}

async function writeBatch(
  dependencies: ProcessBankRowsDependencies,
  batch: readonly BatchRow[],
  labels: Map<string, LabelResult> | null,
): Promise<WriteOutcome> {
  if (batch.length === 0) {
    return { createdByAccount: new Map(), retry: [], problems: [] };
  }
  const { result } = await runServerWrite(
    dependencies.db,
    dependencies.householdId,
    dependencies.now,
    (write) => writeLabelledRows(write, batch, labels),
  );
  return result;
}

function logUnusableAnswer(problem: string) {
  console.warn("Finance labelling answer refused", problem);
}

function addOutcome(
  summary: ProcessSummary,
  outcome: WriteOutcome,
  dependencies: ProcessBankRowsDependencies,
) {
  const onUnusableAnswer = dependencies.onUnusableAnswer ?? logUnusableAnswer;
  for (const problem of outcome.problems) onUnusableAnswer(problem);
  for (const [accountId, count] of outcome.createdByAccount) {
    summary.createdByAccount.set(
      accountId,
      (summary.createdByAccount.get(accountId) ?? 0) + count,
    );
  }
}

/**
 * The AI step after a sync: labels the `new` bank rows of every Bank link
 * of the Household together, 20 at a time in date order, and writes each
 * batch as Transactions. The model runs outside any lock. A failing model
 * request counts a failed try for the batch's rows and ends the run; the
 * next run tries again. A row without a usable answer goes back in the
 * queue. A row with three failed tries is written as Uncategorised for
 * Review. The labeller reads the Household as it was when the run began.
 * No batch starts after the deadline. At the end, the balance check
 * marks again which links have bank rows that wait.
 */
export async function processBankRows(
  dependencies: ProcessBankRowsDependencies,
): Promise<ProcessSummary> {
  const {
    db,
    householdId,
    model,
    now,
    deadline = new Date(now.getTime() + PROCESS_BUDGET_MS),
    clock = () => new Date(),
    onModelError = (error) => {
      console.error("Finance labelling failed", error);
    },
  } = dependencies;
  const summary: ProcessSummary = { createdByAccount: new Map() };
  let queue = await loadQueue(db, householdId);
  let context: LabellingContext | null = null;

  while (queue.length > 0 && clock() < deadline) {
    const batch = withRefs(
      await matchFirst(dependencies, queue.slice(0, LABEL_BATCH_SIZE)),
    );
    queue = queue.slice(LABEL_BATCH_SIZE);
    if (batch.length === 0) continue;

    const toLabel = batch.filter(
      (item) => item.row.labelAttempts < MAX_LABEL_ATTEMPTS,
    );
    let labels: Map<string, LabelResult> | null = null;
    if (model && toLabel.length > 0) {
      context ??= await withHousehold(db, householdId, (scope) =>
        labellingContextRepository.load(scope),
      );
      try {
        labels = await label(dependencies, model, context, toLabel);
      } catch (error) {
        onModelError(error);
        await runServerWrite(db, householdId, now, (write) =>
          bankTransactionRepository.addLabelAttempt(
            write.scope,
            toLabel.map((item) => item.row.id),
          ),
        );
        const exhausted = batch.filter((item) => !toLabel.includes(item));
        addOutcome(
          summary,
          await writeBatch(dependencies, exhausted, null),
          dependencies,
        );
        break;
      }
    }
    const outcome = await writeBatch(
      dependencies,
      batch,
      model ? (labels ?? new Map()) : null,
    );
    addOutcome(summary, outcome, dependencies);
    queue.push(...outcome.retry);
  }

  await runServerWrite(db, householdId, now, (write) =>
    balanceCheck.refresh(write),
  );
  return summary;
}
