import { sideOfKind } from "../domain/accounts/side-of-kind.ts";
import { balanceAt } from "../domain/balance/balance-at.ts";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { SCHEDULE_FIELDS } from "../domain/rules/schedule-fields.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import { checkTransactionShape } from "../sync/check-transaction-shape.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type {
  Mutation,
  TransactionInput,
  TransactionPatch,
} from "../sync/mutation-schema.ts";
import type {
  AccountRow,
  CategoryRow,
  EntryRow,
  RuleRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import type { TablesDraft } from "./create-tables-draft.ts";

export interface LocalMutationContext {
  householdId: string;
  /** ISO timestamp written into `createdAt`, `updatedAt` and `deletedAt`. */
  now: string;
  /** Today in the Household's time zone. */
  today: string;
}

type Args<Name extends Mutation["name"]> = Extract<
  Mutation,
  { name: Name }
>["args"];

interface Scope {
  draft: TablesDraft;
  context: LocalMutationContext;
  /** Account id → first day whose balance may change. */
  accounts: Map<string, string>;
}

function invalid(message: string): never {
  throw new MutationError("invalid", message);
}

function touchAccount(scope: Scope, accountId: string, day: string) {
  const previous = scope.accounts.get(accountId);
  if (previous === undefined || day < previous) {
    scope.accounts.set(accountId, day);
  }
}

function entriesOf(scope: Scope, transactionId: string) {
  const found: EntryRow[] = [];
  for (const entry of scope.draft.values("entries")) {
    if (entry.transactionId === transactionId) found.push(entry);
  }
  return found;
}

function liveEntriesOf(scope: Scope, transactionId: string) {
  return entriesOf(scope, transactionId)
    .filter((entry) => entry.deletedAt === null)
    .sort((a, b) => a.position - b.position);
}

function liveTagIdsOf(scope: Scope, transactionId: string) {
  const tagIds: string[] = [];
  for (const link of scope.draft.values("transactionTags")) {
    if (link.transactionId === transactionId && link.deletedAt === null) {
      tagIds.push(link.tagId);
    }
  }
  return tagIds;
}

/** Same rule as the server: an Entry moves the balance of its account from its own day and from the Transaction's day. */
function touchEntries(
  scope: Scope,
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

function touchTransaction(scope: Scope, transactionId: string, date: string) {
  touchEntries(scope, liveEntriesOf(scope, transactionId), date);
}

function findLive(scope: Scope, id: string) {
  const existing = scope.draft.get("transactions", id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) throw new MutationError("deleted");
  return existing;
}

function isLiveAccount(scope: Scope, id: string) {
  const account = scope.draft.get("accounts", id);
  return account !== undefined && account.deletedAt === null;
}

type TransactionShape = Parameters<typeof checkTransactionShape>[0];

/** Same rule as the server: with `previous`, rows the Transaction named before are not checked again. */
function checkTransactionRows(
  scope: Scope,
  transaction: TransactionShape,
  previous?: TransactionShape,
) {
  checkTransactionShape(transaction);
  const { draft } = scope;
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
  if (
    transaction.entries.some(
      (entry) =>
        !previousAccounts.has(entry.accountId) &&
        !isLiveAccount(scope, entry.accountId),
    )
  ) {
    invalid("Unknown account");
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
    invalid("Unknown refunded transaction");
  }
  if (
    transaction.ruleId &&
    changed("ruleId") &&
    !draft.get("rules", transaction.ruleId)
  ) {
    invalid("Unknown rule");
  }
}

/** Same rule as the server: a live Transaction or child Category keeps a Category from deletion. */
function isCategoryInUse(scope: Scope, id: string) {
  for (const row of scope.draft.values("transactions")) {
    if (row.categoryId === id && row.deletedAt === null) return true;
  }
  for (const row of scope.draft.values("categories")) {
    if (row.parentId === id && row.deletedAt === null) return true;
  }
  return false;
}

/** Same rule as the server: a live Entry, Valuation or Bank link keeps an account from deletion. */
function isAccountInUse(scope: Scope, id: string) {
  for (const row of scope.draft.values("entries")) {
    if (row.accountId === id && row.deletedAt === null) return true;
  }
  for (const row of scope.draft.values("valuations")) {
    if (row.accountId === id && row.deletedAt === null) return true;
  }
  for (const row of scope.draft.values("bankLinks")) {
    if (row.accountId === id && row.deletedAt === null) return true;
  }
  return false;
}

/** The server's `search_text`: payee name, note and category name, lowercased. */
function searchTextOf(scope: Scope, transaction: TransactionRow) {
  const payee =
    transaction.payeeId === null
      ? undefined
      : scope.draft.get("payees", transaction.payeeId)?.name;
  const category =
    transaction.categoryId === null
      ? undefined
      : scope.draft.get("categories", transaction.categoryId)?.name;
  return [payee, transaction.note || undefined, category]
    .filter((part) => part !== undefined)
    .join(" ")
    .toLowerCase();
}

function putTransaction(scope: Scope, row: TransactionRow) {
  const searchText = searchTextOf(scope, row);
  const next =
    searchText === row.searchText
      ? row
      : { ...row, searchText, updatedAt: scope.context.now };
  scope.draft.put("transactions", next.id, next);
}

function refreshSearchText(
  scope: Scope,
  matches: (transaction: TransactionRow) => boolean,
) {
  for (const transaction of [...scope.draft.values("transactions")]) {
    if (matches(transaction)) putTransaction(scope, transaction);
  }
}

function replaceEntries(
  scope: Scope,
  transactionId: string,
  date: string,
  inputs: TransactionInput["entries"],
) {
  const { draft, context } = scope;
  const keep = new Set(inputs.map((input) => input.id));
  inputs.forEach((input, position) => {
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
      fxRate: input.fxRate ?? null,
      position,
      version: existing?.version ?? 0,
      createdAt: existing?.createdAt ?? context.now,
      updatedAt: context.now,
      deletedAt: null,
    });
  });
  for (const entry of entriesOf(scope, transactionId)) {
    if (entry.deletedAt === null && !keep.has(entry.id)) {
      draft.put("entries", entry.id, {
        ...entry,
        deletedAt: context.now,
        updatedAt: context.now,
      });
    }
  }
}

function replaceTags(
  scope: Scope,
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
  for (const link of [...draft.values("transactionTags")]) {
    if (
      link.transactionId === transactionId &&
      link.deletedAt === null &&
      !keep.has(link.tagId)
    ) {
      draft.put("transactionTags", `${transactionId}|${link.tagId}`, {
        ...link,
        deletedAt: context.now,
      });
    }
  }
}

function softDeleteTransaction(scope: Scope, existing: TransactionRow) {
  const { draft, context } = scope;
  for (const entry of entriesOf(scope, existing.id)) {
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

function createTransaction(scope: Scope, input: TransactionInput) {
  const { draft, context } = scope;
  checkTransactionRows(scope, input);
  if (draft.get("transactions", input.id)) {
    invalid("The transaction already exists");
  }
  putTransaction(scope, {
    id: input.id,
    householdId: context.householdId,
    kind: input.kind,
    status: input.status,
    date: input.date,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    payeeId: input.payeeId,
    memberId: input.memberId,
    ruleId: input.ruleId,
    refundOfId: input.refundOfId,
    note: input.note,
    source: "manual",
    needsReview: input.needsReview,
    aiConfidence: null,
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

function updateTransaction(scope: Scope, id: string, patch: TransactionPatch) {
  const { draft, context } = scope;
  const existing = findLive(scope, id);
  const { entries: patchEntries, tagIds: patchTagIds, ...fields } = patch;
  const currentEntries = liveEntriesOf(scope, id);
  const currentTagIds = liveTagIdsOf(scope, id);
  const merged = {
    ...existing,
    ...fields,
    entries: patchEntries ?? currentEntries,
    tagIds: patchTagIds ?? currentTagIds,
  };
  checkTransactionRows(scope, merged, {
    ...existing,
    entries: currentEntries,
    tagIds: currentTagIds,
  });

  if (patchEntries !== undefined || merged.date !== existing.date) {
    touchEntries(scope, currentEntries, existing.date);
    touchEntries(scope, merged.entries, merged.date);
  }
  putTransaction(scope, { ...existing, ...fields, updatedAt: context.now });
  if (patchEntries) {
    replaceEntries(scope, id, merged.date, patchEntries);
  } else if (merged.date !== existing.date) {
    for (const entry of liveEntriesOf(scope, id)) {
      draft.put("entries", entry.id, {
        ...entry,
        date: merged.date,
        updatedAt: context.now,
      });
    }
  }
  if (patchTagIds) replaceTags(scope, id, patchTagIds);
}

function deleteTransaction(scope: Scope, id: string) {
  const existing = scope.draft.get("transactions", id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  touchTransaction(scope, id, existing.date);
  softDeleteTransaction(scope, existing);
}

function restoreTransaction(scope: Scope, id: string) {
  const { draft, context } = scope;
  const existing = draft.get("transactions", id);
  if (!existing) throw new MutationError("not_found");
  if (!existing.deletedAt) return;
  for (const entry of entriesOf(scope, id)) {
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
  scope: Scope,
  id: string,
  patch: TransactionPatch | undefined,
) {
  const existing = findLive(scope, id);
  if (patch && Object.keys(patch).length > 0) {
    updateTransaction(scope, id, patch);
  }
  if (existing.status === "expected") {
    const current = findLive(scope, id);
    scope.draft.put("transactions", id, {
      ...current,
      status: "posted",
      updatedAt: scope.context.now,
    });
    touchTransaction(scope, id, current.date);
  }
}

function skipExpected(scope: Scope, id: string) {
  const existing = scope.draft.get("transactions", id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  if (existing.status !== "expected") {
    invalid("The transaction is confirmed already");
  }
  softDeleteTransaction(scope, existing);
}

/** The account's balance at the end of `day` from the rows the Replica holds. */
function localBalanceAt(scope: Scope, accountId: string, day: string) {
  const valuations = [];
  for (const valuation of scope.draft.values("valuations")) {
    if (valuation.accountId === accountId && valuation.deletedAt === null) {
      valuations.push(valuation);
    }
  }
  const entries = [];
  for (const entry of scope.draft.values("entries")) {
    if (entry.accountId !== accountId || entry.deletedAt !== null) continue;
    const transaction = scope.draft.get("transactions", entry.transactionId);
    if (transaction?.deletedAt === null && transaction.status === "posted") {
      entries.push(entry);
    }
  }
  return balanceAt(computeBalanceDays(valuations, entries), day);
}

function putValuation(scope: Scope, args: Args<"putValuation">) {
  const { draft, context } = scope;
  if (!isLiveAccount(scope, args.accountId)) invalid("Unknown account");

  let existing;
  for (const valuation of draft.values("valuations")) {
    if (valuation.accountId === args.accountId && valuation.on === args.on) {
      existing = valuation;
      break;
    }
  }
  if (existing && !existing.deletedAt) {
    if (
      existing.amountMinor === args.amountMinor &&
      (args.note === undefined || args.note === existing.note)
    ) {
      return;
    }
    draft.put("valuations", existing.id, {
      ...existing,
      amountMinor: args.amountMinor,
      note: args.note ?? existing.note,
      updatedAt: context.now,
    });
  } else {
    if (localBalanceAt(scope, args.accountId, args.on) === args.amountMinor) {
      return;
    }
    if (existing) {
      draft.put("valuations", existing.id, {
        ...existing,
        amountMinor: args.amountMinor,
        note: args.note ?? "",
        deletedAt: null,
        updatedAt: context.now,
      });
    } else {
      if (draft.get("valuations", args.id)) {
        invalid("The valuation id is in use");
      }
      draft.put("valuations", args.id, {
        id: args.id,
        householdId: context.householdId,
        accountId: args.accountId,
        on: args.on,
        amountMinor: args.amountMinor,
        source: "manual",
        note: args.note ?? "",
        version: 0,
        createdAt: context.now,
        updatedAt: context.now,
        deletedAt: null,
      });
    }
  }
  touchAccount(scope, args.accountId, args.on);
}

function deleteValuation(scope: Scope, id: string) {
  const existing = scope.draft.get("valuations", id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  scope.draft.put("valuations", id, {
    ...existing,
    deletedAt: scope.context.now,
    updatedAt: scope.context.now,
  });
  touchAccount(scope, existing.accountId, existing.on);
}

function deletedAtFor(
  scope: Scope,
  deleted: boolean | undefined,
  current: string | null,
) {
  if (deleted === undefined) return current;
  return deleted ? scope.context.now : null;
}

function upsertAccount(scope: Scope, args: Args<"upsertAccount">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("accounts", id);
  let row: AccountRow;
  if (
    existing &&
    deleted &&
    existing.deletedAt === null &&
    isAccountInUse(scope, id)
  ) {
    invalid(
      "Transactions, valuations or a Bank link still use the account; close it",
    );
  }
  if (existing) {
    row = {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
    };
  } else {
    const { groupId, name, kind, currency } = fields;
    if (!groupId || !name || !kind || !currency) {
      invalid("A new account needs a group, name, kind and currency");
    }
    row = {
      id,
      householdId: context.householdId,
      groupId,
      ownerMemberId: fields.ownerMemberId ?? null,
      name,
      institution: fields.institution ?? "",
      kind,
      currency,
      excludedFromNetWorth: fields.excludedFromNetWorth ?? false,
      closedOn: fields.closedOn ?? null,
      position: fields.position ?? 0,
      creditLimitMinor: fields.creditLimitMinor ?? null,
      statementDay: fields.statementDay ?? null,
      paymentDueDay: fields.paymentDueDay ?? null,
      defaultPaymentAccountId: fields.defaultPaymentAccountId ?? null,
      version: 0,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: deleted ? context.now : null,
    };
  }
  if (!existing || fields.groupId !== undefined || fields.kind !== undefined) {
    const group = draft.get("accountGroups", row.groupId);
    if (!group || group.deletedAt) invalid("Unknown group");
    if (group.side !== sideOfKind(row.kind)) {
      invalid(`A ${row.kind} account cannot go in a ${group.side} group`);
    }
  }
  if (fields.ownerMemberId && !draft.get("members", fields.ownerMemberId)) {
    invalid("Unknown member");
  }
  if (
    fields.defaultPaymentAccountId &&
    !isLiveAccount(scope, fields.defaultPaymentAccountId)
  ) {
    invalid("Unknown account");
  }
  draft.put("accounts", id, row);
}

function upsertGroup(scope: Scope, args: Args<"upsertGroup">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("accountGroups", id);
  if (existing) {
    const kinds: AccountRow["kind"][] = [];
    for (const account of draft.values("accounts")) {
      if (account.groupId === id && account.deletedAt === null) {
        kinds.push(account.kind);
      }
    }
    if (deleted && kinds.length > 0) {
      invalid("The group still holds accounts");
    }
    if (fields.side && kinds.some((kind) => sideOfKind(kind) !== fields.side)) {
      invalid("The group holds accounts of the other side");
    }
    draft.put("accountGroups", id, {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
    });
    return;
  }
  if (!fields.name || !fields.side)
    invalid("A new group needs a name and side");
  draft.put("accountGroups", id, {
    id,
    householdId: context.householdId,
    name: fields.name,
    side: fields.side,
    position: fields.position ?? 0,
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: deleted ? context.now : null,
  });
}

function setFxRate(scope: Scope, args: Args<"setFxRate">) {
  scope.draft.put("fxRates", `${args.base}|${args.quote}|${args.on}`, {
    householdId: scope.context.householdId,
    base: args.base,
    quote: args.quote,
    on: args.on,
    rate: args.rate,
    source: "manual",
    version:
      scope.draft.get("fxRates", `${args.base}|${args.quote}|${args.on}`)
        ?.version ?? 0,
  });
}

function checkParent(
  scope: Scope,
  id: string,
  kind: "expense" | "income",
  parentId: string,
) {
  let cursor: string | null = parentId;
  for (let depth = 0; cursor !== null; depth++) {
    if (cursor === id || depth > 32) {
      invalid("A category cannot be its own parent");
    }
    const parent: CategoryRow | undefined = scope.draft.get(
      "categories",
      cursor,
    );
    if (!parent || parent.deletedAt) invalid("Unknown parent category");
    if (parent.kind !== kind) invalid("The parent is of the other kind");
    cursor = parent.parentId;
  }
}

function upsertCategory(scope: Scope, args: Args<"upsertCategory">) {
  const { draft, context } = scope;
  const { id, deleted, archived, ...fields } = args;
  const existing = draft.get("categories", id);
  const archivedAt = (current: string | null) =>
    archived === undefined ? current : archived ? context.now : null;
  if (existing) {
    if (fields.kind !== undefined && fields.kind !== existing.kind) {
      invalid("A category keeps its kind");
    }
    if (fields.parentId) checkParent(scope, id, existing.kind, fields.parentId);
    if (deleted && existing.deletedAt === null) {
      if (existing.isSystem) invalid("A system category stays");
      if (isCategoryInUse(scope, id)) {
        invalid(
          "Transactions or subcategories still use the category; archive it",
        );
      }
    }
    draft.put("categories", id, {
      ...existing,
      ...fields,
      archivedAt: archivedAt(existing.archivedAt),
      updatedAt: context.now,
      deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
    });
    if (fields.name !== undefined && fields.name !== existing.name) {
      refreshSearchText(scope, (row) => row.categoryId === id);
    }
    return;
  }
  if (!fields.kind || !fields.name)
    invalid("A new category needs a kind and name");
  if (fields.parentId) checkParent(scope, id, fields.kind, fields.parentId);
  draft.put("categories", id, {
    id,
    householdId: context.householdId,
    parentId: fields.parentId ?? null,
    kind: fields.kind,
    name: fields.name,
    emoji: fields.emoji ?? "",
    color: fields.color ?? "",
    position: fields.position ?? 0,
    isSystem: false,
    archivedAt: archivedAt(null),
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: deleted ? context.now : null,
  });
}

function upsertPayee(scope: Scope, args: Args<"upsertPayee">) {
  const { draft, context } = scope;
  const { id, deleted, addAliases, ...fields } = args;
  if (fields.defaultCategoryId) {
    const category = draft.get("categories", fields.defaultCategoryId);
    if (!category || category.deletedAt) invalid("Unknown category");
  }
  if (
    fields.defaultAccountId &&
    !isLiveAccount(scope, fields.defaultAccountId)
  ) {
    invalid("Unknown account");
  }
  const existing = draft.get("payees", id);
  if (existing) {
    if (existing.mergedIntoId) {
      throw new MutationError("deleted", "The payee was merged");
    }
    draft.put("payees", id, {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
    });
    if (fields.name !== undefined && fields.name !== existing.name) {
      refreshSearchText(scope, (row) => row.payeeId === id);
    }
  } else {
    if (!fields.name) invalid("A new payee needs a name");
    draft.put("payees", id, {
      id,
      householdId: context.householdId,
      name: fields.name,
      note: fields.note ?? "",
      defaultCategoryId: fields.defaultCategoryId ?? null,
      defaultAccountId: fields.defaultAccountId ?? null,
      mergedIntoId: null,
      version: 0,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: deleted ? context.now : null,
    });
  }
  for (const alias of new Set(addAliases ?? [])) {
    const current = draft.get("payeeAliases", alias);
    if (current?.payeeId === id) continue;
    draft.put("payeeAliases", alias, {
      householdId: context.householdId,
      alias,
      payeeId: id,
      version: current?.version ?? 0,
      updatedAt: context.now,
    });
  }
}

function mergePayee(scope: Scope, args: Args<"mergePayee">) {
  const { draft, context } = scope;
  const from = draft.get("payees", args.fromId);
  const into = draft.get("payees", args.intoId);
  if (!from || !into) throw new MutationError("not_found");
  if (from.deletedAt || into.deletedAt) throw new MutationError("deleted");

  for (const transaction of [...draft.values("transactions")]) {
    if (transaction.payeeId !== from.id) continue;
    draft.put("transactions", transaction.id, {
      ...transaction,
      payeeId: into.id,
      updatedAt: context.now,
    });
  }
  for (const alias of [...draft.values("payeeAliases")]) {
    if (alias.payeeId !== from.id) continue;
    draft.put("payeeAliases", alias.alias, {
      ...alias,
      payeeId: into.id,
      updatedAt: context.now,
    });
  }
  for (const rule of [...draft.values("rules")]) {
    if (rule.template.payeeId !== from.id) continue;
    draft.put("rules", rule.id, {
      ...rule,
      template: { ...rule.template, payeeId: into.id },
      updatedAt: context.now,
    });
  }
  draft.put("payees", from.id, {
    ...from,
    mergedIntoId: into.id,
    deletedAt: context.now,
    updatedAt: context.now,
  });
  refreshSearchText(scope, (row) => row.payeeId === into.id);
}

function upsertTag(scope: Scope, args: Args<"upsertTag">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("tags", id);
  if (existing) {
    draft.put("tags", id, {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
    });
    return;
  }
  if (!fields.name) invalid("A new tag needs a name");
  draft.put("tags", id, {
    id,
    householdId: context.householdId,
    name: fields.name,
    position: fields.position ?? 0,
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: deleted ? context.now : null,
  });
}

function upsertMember(scope: Scope, args: Args<"upsertMember">) {
  const { context } = scope;
  const existing = scope.draft.get("members", args.id);
  if (!existing) {
    scope.draft.put("members", args.id, {
      id: args.id,
      householdId: context.householdId,
      userId: null,
      name: args.name,
      role: "member",
      version: 0,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: null,
    });
    return;
  }
  if (existing.name === args.name) return;
  scope.draft.put("members", args.id, {
    ...existing,
    name: args.name,
    updatedAt: scope.context.now,
  });
}

function upsertRule(scope: Scope, args: Args<"upsertRule">) {
  const { draft, context } = scope;
  const { id, deleted, paused, ...fields } = args;
  if (fields.template) checkTransactionRows(scope, fields.template);
  const pausedAt = (current: string | null) =>
    paused === undefined ? current : paused ? context.now : null;

  const existing = draft.get("rules", id);
  if (!existing) {
    const { name, unit, startsOn, template } = fields;
    if (!name || !unit || !startsOn || !template) {
      invalid("A new rule needs a name, unit, start and template");
    }
    const row: RuleRow = {
      id,
      householdId: context.householdId,
      name,
      unit,
      interval: fields.interval ?? 1,
      dayOfMonth: fields.dayOfMonth ?? null,
      weekday: fields.weekday ?? null,
      monthOfYear: fields.monthOfYear ?? null,
      startsOn,
      endsOn: fields.endsOn ?? null,
      nextOn: startsOn,
      autoPost: fields.autoPost ?? false,
      template,
      pausedAt: pausedAt(null),
      version: 0,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: deleted ? context.now : null,
    };
    draft.put("rules", id, {
      ...row,
      nextOn: fields.nextOn ?? nextOccurrence(row, startsOn),
    });
    return;
  }
  if (existing.deletedAt && deleted !== false) {
    throw new MutationError("deleted");
  }
  const merged = { ...existing, ...fields };
  const scheduleChanged = SCHEDULE_FIELDS.some(
    (field) => fields[field] !== undefined && fields[field] !== existing[field],
  );
  const resumed = paused === false && existing.pausedAt !== null;
  const nextOn =
    fields.nextOn ??
    (scheduleChanged || resumed
      ? nextOccurrence(merged, context.today)
      : existing.nextOn);
  draft.put("rules", id, {
    ...merged,
    nextOn,
    pausedAt: pausedAt(existing.pausedAt),
    updatedAt: context.now,
    deletedAt: deletedAtFor(scope, deleted, existing.deletedAt),
  });
  if (deleted) {
    for (const transaction of [...draft.values("transactions")]) {
      if (
        transaction.ruleId === id &&
        transaction.status === "expected" &&
        transaction.deletedAt === null
      ) {
        softDeleteTransaction(scope, transaction);
      }
    }
  }
}

function applyTo(scope: Scope, mutation: Mutation) {
  switch (mutation.name) {
    case "createTransaction": {
      createTransaction(scope, mutation.args);
      return;
    }
    case "updateTransaction": {
      updateTransaction(scope, mutation.args.id, mutation.args.patch);
      return;
    }
    case "deleteTransaction": {
      deleteTransaction(scope, mutation.args.id);
      return;
    }
    case "restoreTransaction": {
      restoreTransaction(scope, mutation.args.id);
      return;
    }
    case "confirmExpected": {
      confirmExpected(scope, mutation.args.id, mutation.args.patch);
      return;
    }
    case "skipExpected": {
      skipExpected(scope, mutation.args.id);
      return;
    }
    case "putValuation": {
      putValuation(scope, mutation.args);
      return;
    }
    case "deleteValuation": {
      deleteValuation(scope, mutation.args.id);
      return;
    }
    case "upsertAccount": {
      upsertAccount(scope, mutation.args);
      return;
    }
    case "upsertGroup": {
      upsertGroup(scope, mutation.args);
      return;
    }
    case "setFxRate": {
      setFxRate(scope, mutation.args);
      return;
    }
    case "upsertCategory": {
      upsertCategory(scope, mutation.args);
      return;
    }
    case "upsertPayee": {
      upsertPayee(scope, mutation.args);
      return;
    }
    case "mergePayee": {
      mergePayee(scope, mutation.args);
      return;
    }
    case "upsertTag": {
      upsertTag(scope, mutation.args);
      return;
    }
    case "upsertMember": {
      upsertMember(scope, mutation.args);
      return;
    }
    case "upsertRule": {
      upsertRule(scope, mutation.args);
      return;
    }
  }
}

/**
 * Applies one mutation to the Replica the way the server will, so the UI
 * shows the result before the push. Throws `MutationError` when the server
 * would reject it; the draft may then hold part of the change, so the caller
 * discards it. Returns the accounts whose balances change, with the first
 * day that changes.
 */
export function applyLocalMutation(
  draft: TablesDraft,
  mutation: Mutation,
  context: LocalMutationContext,
): Map<string, string> {
  const scope: Scope = { draft, context, accounts: new Map() };
  applyTo(scope, mutation);
  return scope.accounts;
}
