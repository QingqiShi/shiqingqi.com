import type { ReplicaSnapshot } from "../replica/types.ts";
import type {
  AccountRow,
  CategoryRow,
  MemberRow,
  PayeeRow,
  TagRow,
} from "../sync/row-schemas.ts";

export interface TransactionLookups {
  /** Every account, deleted ones too, so an old Transaction still names its account. */
  accountById: ReadonlyMap<string, AccountRow>;
  /** A name that tells accounts apart: the name, then the institution or the owner when names repeat. */
  accountLabelById: ReadonlyMap<string, string>;
  categoryById: ReadonlyMap<string, CategoryRow>;
  /** The Category's emoji, else its parent's. */
  categoryEmojiById: ReadonlyMap<string, string>;
  /** Each Category with every Category below it. */
  categoryDescendantsById: ReadonlyMap<string, ReadonlySet<string>>;
  payeeById: ReadonlyMap<string, PayeeRow>;
  tagById: ReadonlyMap<string, TagRow>;
  memberById: ReadonlyMap<string, MemberRow>;
}

function accountLabels(
  accounts: ReadonlyMap<string, AccountRow>,
  members: ReadonlyMap<string, MemberRow>,
) {
  const live = [...accounts.values()].filter((row) => row.deletedAt === null);
  const byName = new Map<string, AccountRow[]>();
  for (const account of live) {
    const key = account.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), account]);
  }
  const labels = new Map<string, string>();
  for (const account of accounts.values()) {
    const sameName = byName.get(account.name.trim().toLowerCase()) ?? [];
    if (sameName.length <= 1) {
      labels.set(account.id, account.name);
      continue;
    }
    const owner = account.ownerMemberId
      ? members.get(account.ownerMemberId)?.name
      : undefined;
    const institutionTells = sameName.every(
      (other) =>
        other.id === account.id ||
        other.institution.trim() !== account.institution.trim(),
    );
    const parts = [account.name];
    if (account.institution.trim() !== "" && institutionTells) {
      parts.push(account.institution.trim());
    } else {
      if (owner) parts.unshift(owner);
      if (account.institution.trim() !== "") {
        parts.push(account.institution.trim());
      }
    }
    labels.set(account.id, parts.join(" · "));
  }
  return labels;
}

function categoryTree(categories: ReadonlyMap<string, CategoryRow>) {
  const children = new Map<string, string[]>();
  for (const category of categories.values()) {
    if (category.parentId === null) continue;
    children.set(category.parentId, [
      ...(children.get(category.parentId) ?? []),
      category.id,
    ]);
  }
  const descendants = new Map<string, ReadonlySet<string>>();
  const emoji = new Map<string, string>();
  for (const category of categories.values()) {
    const all = new Set<string>([category.id]);
    const queue = [category.id];
    while (queue.length > 0) {
      const id = queue.pop();
      for (const child of id === undefined ? [] : (children.get(id) ?? [])) {
        if (all.has(child)) continue;
        all.add(child);
        queue.push(child);
      }
    }
    descendants.set(category.id, all);

    let current: CategoryRow | undefined = category;
    let found = "";
    for (let depth = 0; current && depth < 8 && found === ""; depth++) {
      found = current.emoji.trim();
      current =
        current.parentId === null
          ? undefined
          : categories.get(current.parentId);
    }
    emoji.set(category.id, found);
  }
  return { descendants, emoji };
}

let last: {
  tables: ReplicaSnapshot["tables"];
  result: TransactionLookups;
} | null = null;

/** Maps from id to row for the small tables a Transaction names. The same object until one of them changes. */
export function selectTransactionLookups(
  snapshot: ReplicaSnapshot,
): TransactionLookups {
  const { tables } = snapshot;
  if (
    last &&
    last.tables.accounts === tables.accounts &&
    last.tables.members === tables.members &&
    last.tables.categories === tables.categories &&
    last.tables.payees === tables.payees &&
    last.tables.tags === tables.tags
  ) {
    return last.result;
  }
  const tree = categoryTree(tables.categories);
  const result: TransactionLookups = {
    accountById: tables.accounts,
    accountLabelById: accountLabels(tables.accounts, tables.members),
    categoryById: tables.categories,
    categoryEmojiById: tree.emoji,
    categoryDescendantsById: tree.descendants,
    payeeById: tables.payees,
    tagById: tables.tags,
    memberById: tables.members,
  };
  last = { tables, result };
  return result;
}
