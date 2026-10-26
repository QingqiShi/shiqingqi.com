import {
  checkTransactionShape,
  type TransactionShape,
} from "../sync/check-transaction-shape.ts";
import { labelledByAfter } from "../sync/labelled-by-after.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type {
  TransactionInput,
  TransactionPatch,
} from "../sync/mutation-schema.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { invalid } from "./invalid.ts";
import { touchAccount } from "./touch-account.ts";
import type { MutationDraft, MutationScope, Provenance } from "./types.ts";
import { absent } from "./wait-for-server.ts";

const MEMBER_PROVENANCE: Provenance = {
  labelledBy: "member",
  aiReason: null,
  source: "manual",
};

function liveEntriesOf(scope: MutationScope, transactionId: string) {
  return scope.draft
    .where("entries", { transactionId })
    .filter((entry) => entry.deletedAt === null)
    .sort((a, b) => a.position - b.position);
}

function liveTagIdsOf(scope: MutationScope, transactionId: string) {
  return scope.draft
    .where("transactionTags", { transactionId })
    .filter((link) => link.deletedAt === null)
    .map((link) => link.tagId);
}

/** An Entry moves the balance of its account from its own day and from the Transaction's day. */
function touchEntries(
  scope: MutationScope,
  entries: readonly { accountId: string; date?: string }[],
  date: string,
) {
  for (const entry of entries) {
    touchAccount(
      scope,
      entry.accountId,
      entry.date !== undefined && entry.date < date ? entry.date : date,
    );
  }
}

/** Marks the balances that the Transaction's Entries, deleted ones included, may change. */
function touchTransaction(
  scope: MutationScope,
  transactionId: string,
  date: string,
) {
  touchEntries(scope, scope.draft.where("entries", { transactionId }), date);
}

function findTransaction(scope: MutationScope, id: string) {
  return (
    scope.draft.get("transactions", id) ??
    absent(scope.draft, "transactions", new MutationError("not_found"))
  );
}

function findLive(scope: MutationScope, id: string) {
  const existing = findTransaction(scope, id);
  if (existing.deletedAt) throw new MutationError("deleted");
  return existing;
}

/**
 * Checks the rules every Transaction keeps, whoever writes it: those of
 * `checkTransactionShape`, and every row it names exists, a Category, an
 * account, a Tag and a Payee live. With `previous`, a row the Transaction
 * named before is not checked again, so a Transaction whose Category was
 * deleted can still be edited.
 */
export function checkTransactionRows(
  draft: MutationDraft,
  transaction: TransactionShape,
  previous?: TransactionShape,
) {
  checkTransactionShape(transaction);
  const changed = (key: keyof TransactionShape) =>
    previous === undefined || previous[key] !== transaction[key];
  if (
    transaction.categoryId !== null &&
    (changed("categoryId") || changed("kind"))
  ) {
    const category = draft.get("categories", transaction.categoryId);
    if (!category || category.deletedAt) invalid("Unknown category");
    if (category.kind !== transaction.kind) {
      invalid(`The category is not an ${transaction.kind} category`);
    }
  }
  const previousAccounts = new Set(
    previous?.entries.map((entry) => entry.accountId),
  );
  for (const { accountId } of transaction.entries) {
    if (previousAccounts.has(accountId)) continue;
    const account = draft.get("accounts", accountId);
    if (!account || account.deletedAt) invalid("Unknown account");
  }
  const previousTags = new Set(previous?.tagIds);
  for (const tagId of transaction.tagIds) {
    if (previousTags.has(tagId)) continue;
    const tag = draft.get("tags", tagId);
    if (!tag || tag.deletedAt) invalid("Unknown tag");
  }
  if (transaction.payeeId !== null && changed("payeeId")) {
    const payee = draft.get("payees", transaction.payeeId);
    if (!payee || payee.deletedAt) invalid("Unknown payee");
  }
  if (
    transaction.memberId !== null &&
    changed("memberId") &&
    !draft.get("members", transaction.memberId)
  ) {
    invalid("Unknown member");
  }
  if (
    transaction.refundOfId &&
    changed("refundOfId") &&
    !draft.get("transactions", transaction.refundOfId)
  ) {
    absent(
      draft,
      "transactions",
      new MutationError("invalid", "Unknown refunded transaction"),
    );
  }
  if (
    transaction.ruleId &&
    changed("ruleId") &&
    !draft.get("rules", transaction.ruleId)
  ) {
    invalid("Unknown rule");
  }
}

/** Makes `inputs` the Transaction's Entries: a known id keeps its row, a new id adds one, and the rest are deleted. */
function replaceEntries(
  scope: MutationScope,
  transactionId: string,
  date: string,
  inputs: TransactionInput["entries"],
) {
  const { draft, context } = scope;
  const keep = new Set(inputs.map((input) => input.id));
  for (const [position, input] of inputs.entries()) {
    const existing = draft.get("entries", input.id);
    if (existing && existing.transactionId !== transactionId) {
      throw new MutationError("forbidden", "An entry id belongs elsewhere");
    }
    draft.put("entries", input.id, {
      id: input.id,
      householdId: context.householdId,
      transactionId,
      accountId: input.accountId,
      date,
      amountMinor: input.amountMinor,
      position,
      version: existing?.version ?? 0,
      createdAt: existing?.createdAt ?? context.now,
      updatedAt: context.now,
      deletedAt: null,
    });
  }
  for (const entry of draft.where("entries", { transactionId })) {
    if (entry.deletedAt === null && !keep.has(entry.id)) {
      draft.put("entries", entry.id, {
        ...entry,
        deletedAt: context.now,
        updatedAt: context.now,
      });
    }
  }
}

/** Makes `tagIds` the Transaction's Tags; a removed Tag is soft-deleted so the removal syncs. */
function replaceTags(
  scope: MutationScope,
  transactionId: string,
  tagIds: readonly string[],
) {
  const { draft, context } = scope;
  const keep = new Set(tagIds);
  for (const tagId of keep) {
    const key = `${transactionId}|${tagId}`;
    const existing = draft.get("transactionTags", key);
    if (existing && existing.deletedAt === null) continue;
    draft.put("transactionTags", key, {
      transactionId,
      tagId,
      householdId: context.householdId,
      version: existing?.version ?? 0,
      deletedAt: null,
    });
  }
  for (const link of draft.where("transactionTags", { transactionId })) {
    if (link.deletedAt === null && !keep.has(link.tagId)) {
      draft.put("transactionTags", `${transactionId}|${link.tagId}`, {
        ...link,
        deletedAt: context.now,
      });
    }
  }
}

/** Soft-deletes the Transaction and its live Entries with one timestamp, so a restore can find them. */
export function softDeleteTransaction(
  scope: MutationScope,
  existing: TransactionRow,
) {
  const { draft, context } = scope;
  for (const entry of draft.where("entries", { transactionId: existing.id })) {
    if (entry.deletedAt !== null) continue;
    draft.put("entries", entry.id, {
      ...entry,
      deletedAt: context.now,
      updatedAt: context.now,
    });
  }
  draft.put("transactions", existing.id, {
    ...existing,
    deletedAt: context.now,
    updatedAt: context.now,
  });
}

/** A Member's Transaction is always labelled by the Member; only the server gives other provenance. */
function createTransaction(scope: MutationScope, input: TransactionInput) {
  const { draft, context } = scope;
  const { labelledBy, aiReason, source } =
    context.actor === "member"
      ? MEMBER_PROVENANCE
      : (context.provenance ?? MEMBER_PROVENANCE);
  checkTransactionRows(draft, input);
  if (draft.get("transactions", input.id)) {
    invalid("The transaction already exists");
  }
  draft.put("transactions", input.id, {
    id: input.id,
    householdId: context.householdId,
    kind: input.kind,
    status: input.status,
    date: input.date,
    categoryId: input.categoryId,
    payeeId: input.payeeId,
    memberId: input.memberId,
    ruleId: input.ruleId,
    refundOfId: input.refundOfId,
    note: input.note,
    source,
    needsReview: input.needsReview,
    labelledBy,
    aiReason,
    searchText: "",
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  });
  replaceEntries(scope, input.id, input.date, input.entries);
  replaceTags(scope, input.id, input.tagIds);
  touchEntries(scope, input.entries, input.date);
}

function updateTransaction(
  scope: MutationScope,
  id: string,
  patch: TransactionPatch,
) {
  const { draft, context } = scope;
  const existing = findLive(scope, id);
  const { entries: patchEntries, tagIds: patchTagIds, ...fields } = patch;
  const currentEntries = liveEntriesOf(scope, id);
  const currentTagIds = liveTagIdsOf(scope, id);
  const before = {
    ...existing,
    entries: currentEntries,
    tagIds: currentTagIds,
  };
  const merged = {
    ...existing,
    ...fields,
    entries: patchEntries ?? currentEntries,
    tagIds: patchTagIds ?? currentTagIds,
  };
  checkTransactionRows(draft, merged, before);

  if (patchEntries !== undefined || merged.date !== existing.date) {
    touchEntries(scope, currentEntries, existing.date);
    touchEntries(scope, merged.entries, merged.date);
  }
  draft.put("transactions", id, {
    ...existing,
    ...fields,
    labelledBy: labelledByAfter(context.actor, before, merged),
    updatedAt: context.now,
  });
  if (patchEntries) {
    replaceEntries(scope, id, merged.date, patchEntries);
  } else if (merged.date !== existing.date) {
    for (const entry of currentEntries) {
      draft.put("entries", entry.id, {
        ...entry,
        date: merged.date,
        updatedAt: context.now,
      });
    }
  }
  if (patchTagIds) replaceTags(scope, id, patchTagIds);
}

function deleteTransaction(scope: MutationScope, id: string) {
  const existing = findTransaction(scope, id);
  if (existing.deletedAt) return;
  touchTransaction(scope, id, existing.date);
  softDeleteTransaction(scope, existing);
}

/** Restores the Transaction and the Entries deleted with it. */
function restoreTransaction(scope: MutationScope, id: string) {
  const { draft, context } = scope;
  const existing = findTransaction(scope, id);
  if (!existing.deletedAt) return;
  for (const entry of draft.where("entries", { transactionId: id })) {
    if (entry.deletedAt !== existing.deletedAt) continue;
    draft.put("entries", entry.id, {
      ...entry,
      deletedAt: null,
      updatedAt: context.now,
    });
  }
  draft.put("transactions", id, {
    ...existing,
    deletedAt: null,
    updatedAt: context.now,
  });
  touchTransaction(scope, id, existing.date);
}

function confirmExpected(
  scope: MutationScope,
  id: string,
  patch: TransactionPatch | undefined,
) {
  const existing = findLive(scope, id);
  if (patch && Object.keys(patch).length > 0) {
    updateTransaction(scope, id, patch);
  }
  if (existing.status !== "expected") return;
  const current = findLive(scope, id);
  scope.draft.put("transactions", id, {
    ...current,
    status: "posted",
    updatedAt: scope.context.now,
  });
  touchTransaction(scope, id, current.date);
}

function skipExpected(scope: MutationScope, id: string) {
  const existing = findTransaction(scope, id);
  if (existing.deletedAt) return;
  if (existing.status !== "expected") {
    invalid("The transaction is confirmed already");
  }
  softDeleteTransaction(scope, existing);
}

export const transactionMutations = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
  confirmExpected,
  skipExpected,
};
