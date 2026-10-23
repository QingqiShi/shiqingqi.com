import { randomUUID } from "node:crypto";
import type { LabelResult, RowLabel } from "../ai/label-bank-rows.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import {
  bankTransactionRepository,
  type BankTransactionRecord,
} from "../db/repositories/bank-transaction-repository.ts";
import { categoryRepository } from "../db/repositories/category-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { withSavepoint } from "../db/with-household.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { TransactionInput } from "../sync/mutation-schema.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";
import { transactionMutations } from "../sync/transaction-mutations.ts";
import { MAX_NOTE_LENGTH } from "../sync/wire-fields.ts";
import { ensureInTransitAccount } from "./ensure-in-transit-account.ts";
import { matchBankRows, type MatchLink } from "./match-bank-rows.ts";
import { toEntryAmount } from "./to-entry-amount.ts";

/** After this many failed tries, a row is written as Uncategorised for a person to label. */
export const MAX_LABEL_ATTEMPTS = 3;

/** A Bank link as the process step needs it. */
export interface ProcessLink extends MatchLink {
  currency: string;
  ownerMemberId: string | null;
}

/** One bank row of a batch, with the ref the model knows it by. */
export interface BatchRow {
  ref: string;
  row: BankTransactionRecord;
  link: ProcessLink;
}

export interface WriteOutcome {
  /** New Transactions, by the account of the bank row. */
  createdByAccount: Map<string, number>;
  /** Rows to label again: the answer was not usable. */
  retry: BatchRow[];
  /** Why each unusable answer was refused, for the logs. */
  problems: string[];
}

/** The model's labels for a row, or null to write the fallback. */
type Answer = RowLabel | null;

class Unusable extends Error {}

function transactionIdOf(row: BankTransactionRecord) {
  return nameBasedUuid(`bank:${row.linkId}:${row.providerTxId}`);
}

function entryIdOf(row: BankTransactionRecord, suffix = "") {
  return nameBasedUuid(`bank-entry:${row.linkId}:${row.providerTxId}${suffix}`);
}

function bankNote(row: BankTransactionRecord) {
  return row.description || row.merchant;
}

async function resolvePayee(
  context: ServerWriteContext,
  payee: RowLabel["payee"],
): Promise<string | null> {
  const { scope } = context;
  if (payee === null) return null;
  if ("id" in payee) {
    const found = await payeeRepository.findById(scope, payee.id);
    if (!found || found.deletedAt) throw new Unusable("Unknown payee");
    return found.mergedIntoId ?? found.id;
  }
  const existing = await payeeRepository.findLiveByName(scope, payee.name);
  if (existing) return existing.id;
  const id = randomUUID();
  await payeeRepository.insert(scope, { id, name: payee.name });
  context.markWritten();
  return id;
}

interface Writer {
  context: ServerWriteContext;
  /** The rows of the batch by ref, to find the other side of a pair. */
  byRef: Map<string, BatchRow>;
  /** Rows written or matched in this batch. */
  done: Set<string>;
}

async function fallbackInput(
  writer: Writer,
  item: BatchRow,
  amountMinor: number,
): Promise<TransactionInput> {
  const { context } = writer;
  const { row, link } = item;
  const kind = amountMinor < 0 ? "expense" : "income";
  const categoryId = await categoryRepository.findSystem(context.scope, kind);
  if (!categoryId) {
    throw new Error(`The Household has no Uncategorised ${kind} category`);
  }
  return {
    id: transactionIdOf(row),
    kind,
    status: "posted",
    date: row.date,
    categoryId,
    payeeId: null,
    memberId: await memberRepository.activeIdOrNull(
      context.scope,
      link.ownerMemberId,
    ),
    ruleId: null,
    refundOfId: null,
    note: bankNote(row).slice(0, MAX_NOTE_LENGTH),
    needsReview: true,
    entries: [
      {
        id: entryIdOf(row),
        accountId: link.accountId,
        amountMinor,
      },
    ],
    tagIds: [],
  };
}

/** The Entry on the other side of a transfer, and whether the row partners another of the batch. */
async function otherSide(
  writer: Writer,
  item: BatchRow,
  label: RowLabel,
  amountMinor: number,
): Promise<{
  entry: TransactionInput["entries"][number];
  partner: BatchRow | null;
  needsReview: boolean;
}> {
  const { context } = writer;
  const { row, link } = item;
  const transfer = label.transfer ?? { type: "unknown" as const };
  if (transfer.type === "pair") {
    const partner = writer.byRef.get(transfer.ref);
    if (!partner || writer.done.has(partner.row.id)) {
      throw new Unusable("The pair is gone");
    }
    const partnerAmount = toEntryAmount(partner.row.amountMinor, partner.link);
    return {
      entry: {
        id: entryIdOf(partner.row),
        accountId: partner.link.accountId,
        amountMinor: partnerAmount,
      },
      partner,
      needsReview: false,
    };
  }
  if (transfer.type === "account") {
    const sameCurrency = await isInCurrency(
      context,
      transfer.accountId,
      link.currency,
    );
    if (sameCurrency) {
      return {
        entry: {
          id: entryIdOf(row, ":other"),
          accountId: transfer.accountId,
          amountMinor: -amountMinor,
        },
        partner: null,
        needsReview: false,
      };
    }
  }
  return {
    entry: {
      id: entryIdOf(row, ":in-transit"),
      accountId: await ensureInTransitAccount(context, link.currency),
      amountMinor: -amountMinor,
    },
    partner: null,
    needsReview: transfer.type === "account",
  };
}

async function isInCurrency(
  context: ServerWriteContext,
  accountId: string,
  currency: string,
) {
  const account = await accountRepository.findById(context.scope, accountId);
  if (!account || account.deletedAt || account.isSystem) {
    throw new Unusable("Unknown transfer account");
  }
  return account.currency === currency;
}

async function labelledInput(
  writer: Writer,
  item: BatchRow,
  label: RowLabel,
  amountMinor: number,
): Promise<{ input: TransactionInput; partner: BatchRow | null }> {
  const { context } = writer;
  const { row, link } = item;
  const common = {
    id: transactionIdOf(row),
    status: "posted" as const,
    date: row.date,
    memberId:
      (await memberRepository.activeIdOrNull(context.scope, label.memberId)) ??
      (await memberRepository.activeIdOrNull(
        context.scope,
        link.ownerMemberId,
      )),
    ruleId: null,
    refundOfId: null,
    note: bankNote(row).slice(0, MAX_NOTE_LENGTH),
    tagIds: label.tagIds,
  };
  const ownEntry = {
    id: entryIdOf(row),
    accountId: link.accountId,
    amountMinor,
  };
  if (label.kind === "transfer") {
    const other = await otherSide(writer, item, label, amountMinor);
    const entries =
      amountMinor < 0 ? [ownEntry, other.entry] : [other.entry, ownEntry];
    return {
      input: {
        ...common,
        kind: "transfer",
        categoryId: null,
        payeeId: null,
        needsReview: label.needsReview || other.needsReview,
        entries,
      },
      partner: other.partner,
    };
  }
  const entries: TransactionInput["entries"] = [ownEntry];
  if (label.paysDownAccountId !== null) {
    entries.push({
      id: entryIdOf(row, ":pays-down"),
      accountId: label.paysDownAccountId,
      amountMinor: -amountMinor,
    });
  }
  return {
    input: {
      ...common,
      kind: label.kind,
      categoryId: label.categoryId,
      payeeId: await resolvePayee(context, label.payee),
      needsReview: label.needsReview,
      entries,
    },
    partner: null,
  };
}

/** Writes the row's Transaction in a savepoint, and counts it. */
async function create(
  writer: Writer,
  outcome: WriteOutcome,
  item: BatchRow,
  answer: Answer,
): Promise<void> {
  const { context } = writer;
  const { row } = item;
  const amountMinor = toEntryAmount(row.amountMinor, item.link);
  await withSavepoint(context.scope, async (savepoint) => {
    const nested: ServerWriteContext = { ...context, scope: savepoint };
    const nestedWriter = { ...writer, context: nested };
    const { input, partner } =
      answer === null
        ? {
            input: await fallbackInput(nestedWriter, item, amountMinor),
            partner: null,
          }
        : await labelledInput(nestedWriter, item, answer, amountMinor);
    await transactionMutations.create(nested, input, {
      labelledBy: "ai",
      aiReason: answer?.reason || null,
      source: "bank",
    });
    await bankTransactionRepository.setMatched(nested.scope, [
      { id: row.id, transactionId: input.id },
      ...(partner ? [{ id: partner.row.id, transactionId: input.id }] : []),
    ]);
    if (partner) writer.done.add(partner.row.id);
  });
  const account = item.link.accountId;
  outcome.createdByAccount.set(
    account,
    (outcome.createdByAccount.get(account) ?? 0) + 1,
  );
}

/**
 * Writes one labelled batch under the Household lock, in date order. A row
 * that is no longer `new` is skipped, so a cron and a Sync now that ran at
 * once write each row once. A row is matched first: a Transaction written
 * earlier, such as the other side of a transfer, may already hold it.
 * Otherwise it becomes a Transaction labelled by the AI. A row whose answer
 * is unusable counts a failed try and comes back in `retry`, until the
 * last try writes it as Uncategorised for Review. With `labels` null, every
 * row is written that way.
 */
export async function writeLabelledRows(
  context: ServerWriteContext,
  batch: readonly BatchRow[],
  labels: Map<string, LabelResult> | null,
): Promise<WriteOutcome> {
  const outcome: WriteOutcome = {
    createdByAccount: new Map(),
    retry: [],
    problems: [],
  };
  const current = new Map(
    (
      await bankTransactionRepository.findByIds(
        context.scope,
        batch.map((item) => item.row.id),
      )
    ).map((row) => [row.id, row]),
  );
  const writer: Writer = {
    context,
    byRef: new Map(batch.map((item) => [item.ref, item])),
    done: new Set(),
  };
  const ordered = [...batch].sort(
    (a, b) =>
      a.row.date.localeCompare(b.row.date) ||
      a.row.providerTxId.localeCompare(b.row.providerTxId),
  );

  for (const item of ordered) {
    const row = current.get(item.row.id);
    if (!row || row.state !== "new" || writer.done.has(row.id)) continue;
    const fresh = { ...item, row };
    const { matchedIds } = await matchBankRows(context, item.link, [row]);
    if (matchedIds.has(row.id)) {
      writer.done.add(row.id);
      continue;
    }

    if (labels === null || row.labelAttempts >= MAX_LABEL_ATTEMPTS) {
      await create(writer, outcome, fresh, null);
      continue;
    }
    const result = labels.get(item.ref);
    try {
      if (!result?.ok) throw new Unusable(result?.problem ?? "No answer");
      await create(writer, outcome, fresh, result.label);
    } catch (error) {
      if (!(error instanceof Unusable || error instanceof MutationError)) {
        throw error;
      }
      outcome.problems.push(`${row.providerTxId}: ${error.message}`);
      const attempts = row.labelAttempts + 1;
      await bankTransactionRepository.addLabelAttempt(context.scope, [row.id]);
      if (attempts >= MAX_LABEL_ATTEMPTS) {
        await create(writer, outcome, fresh, null);
      } else {
        outcome.retry.push({
          ...fresh,
          row: { ...row, labelAttempts: attempts },
        });
      }
    }
  }
  return outcome;
}
