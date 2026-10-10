import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import {
  upsertAccountArgsSchema,
  upsertAccountGroupArgsSchema,
  upsertCategoryArgsSchema,
  upsertPayeeArgsSchema,
  upsertRuleArgsSchema,
  upsertTagArgsSchema,
  type Mutation,
  type TransactionPatch,
} from "../sync/mutation-schema.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import type { LocalMutationInput } from "./create-replica-store.ts";
import type { ReplicaSnapshot } from "./types.ts";

type UpsertMutation = Extract<
  Mutation,
  {
    name:
      | "upsertAccount"
      | "upsertGroup"
      | "upsertCategory"
      | "upsertPayee"
      | "upsertTag"
      | "upsertRule";
  }
>;

const UPSERT_TABLES = {
  upsertAccount: "accounts",
  upsertGroup: "accountGroups",
  upsertCategory: "categories",
  upsertPayee: "payees",
  upsertTag: "tags",
  upsertRule: "rules",
} as const;

/** Mutation fields that the row keeps as a timestamp. */
const FLAG_FIELDS: Partial<Record<string, string>> = {
  deleted: "deletedAt",
  archived: "archivedAt",
  paused: "pausedAt",
};

function previousPatch(
  snapshot: ReplicaSnapshot,
  row: TransactionRow,
  patch: TransactionPatch,
): TransactionPatch {
  const previous: TransactionPatch = {};
  for (const key of Object.keys(patch)) {
    switch (key) {
      case "entries": {
        previous.entries = (
          selectEntriesByTransaction(snapshot).get(row.id) ?? []
        ).map((entry) => ({
          id: entry.id,
          accountId: entry.accountId,
          amountMinor: entry.amountMinor,
          fxRate: entry.fxRate,
        }));
        break;
      }
      case "tagIds": {
        previous.tagIds = [
          ...(selectTagIdsByTransaction(snapshot).get(row.id) ?? []),
        ];
        break;
      }
      case "kind":
      case "date":
      case "amountMinor":
      case "categoryId":
      case "payeeId":
      case "memberId":
      case "refundOfId":
      case "note":
      case "needsReview": {
        Object.assign(previous, { [key]: row[key] });
        break;
      }
    }
  }
  return previous;
}

/** Deletes the confirmed row and adds the Expected one again under a new id, because no mutation sets a Transaction back to Expected. */
function unconfirm(
  snapshot: ReplicaSnapshot,
  row: TransactionRow,
  createId: () => string,
): LocalMutationInput[] {
  const entries = selectEntriesByTransaction(snapshot).get(row.id) ?? [];
  return [
    { name: "deleteTransaction", args: { id: row.id } },
    {
      name: "createTransaction",
      args: {
        id: createId(),
        kind: row.kind,
        status: "expected",
        date: row.date,
        amountMinor: row.amountMinor,
        categoryId: row.categoryId,
        payeeId: row.payeeId,
        memberId: row.memberId,
        ruleId: row.ruleId,
        refundOfId: row.refundOfId,
        note: row.note,
        needsReview: row.needsReview,
        entries: entries.map((entry) => ({
          id: createId(),
          accountId: entry.accountId,
          amountMinor: entry.amountMinor,
          fxRate: entry.fxRate,
        })),
        tagIds: [...(selectTagIdsByTransaction(snapshot).get(row.id) ?? [])],
      },
    },
  ];
}

function inverseUpsert(
  snapshot: ReplicaSnapshot,
  mutation: UpsertMutation,
): LocalMutationInput[] | null {
  const row: Record<string, unknown> | undefined = snapshot.tables[
    UPSERT_TABLES[mutation.name]
  ].get(mutation.args.id);
  if (!row) {
    return [
      { name: mutation.name, args: { id: mutation.args.id, deleted: true } },
    ];
  }
  const previous: Record<string, unknown> = { id: mutation.args.id };
  for (const key of Object.keys(mutation.args)) {
    if (key === "id" || key === "addAliases") continue;
    const flag = FLAG_FIELDS[key];
    previous[key] = flag === undefined ? row[key] : row[flag] != null;
  }
  switch (mutation.name) {
    case "upsertAccount": {
      return [
        { name: mutation.name, args: upsertAccountArgsSchema.parse(previous) },
      ];
    }
    case "upsertGroup": {
      return [
        {
          name: mutation.name,
          args: upsertAccountGroupArgsSchema.parse(previous),
        },
      ];
    }
    case "upsertCategory": {
      return [
        { name: mutation.name, args: upsertCategoryArgsSchema.parse(previous) },
      ];
    }
    case "upsertPayee": {
      return [
        { name: mutation.name, args: upsertPayeeArgsSchema.parse(previous) },
      ];
    }
    case "upsertTag": {
      return [
        { name: mutation.name, args: upsertTagArgsSchema.parse(previous) },
      ];
    }
    case "upsertRule": {
      return [
        { name: mutation.name, args: upsertRuleArgsSchema.parse(previous) },
      ];
    }
  }
}

/**
 * The mutations that put the Replica back as it was before `mutation`.
 * Read `snapshot` before the mutation is applied. Null when the change
 * cannot be undone, such as a Payee merge.
 */
export function inverseMutations(
  snapshot: ReplicaSnapshot,
  mutation: Mutation,
  createId: () => string,
): LocalMutationInput[] | null {
  switch (mutation.name) {
    case "createTransaction": {
      return [{ name: "deleteTransaction", args: { id: mutation.args.id } }];
    }
    case "updateTransaction": {
      const row = snapshot.tables.transactions.get(mutation.args.id);
      if (!row) return null;
      return [
        {
          name: "updateTransaction",
          args: {
            id: row.id,
            patch: previousPatch(snapshot, row, mutation.args.patch),
          },
        },
      ];
    }
    case "deleteTransaction":
    case "skipExpected": {
      const row = snapshot.tables.transactions.get(mutation.args.id);
      if (!row || row.deletedAt !== null) return [];
      return [{ name: "restoreTransaction", args: { id: row.id } }];
    }
    case "restoreTransaction": {
      const row = snapshot.tables.transactions.get(mutation.args.id);
      if (!row || row.deletedAt === null) return [];
      return [{ name: "deleteTransaction", args: { id: row.id } }];
    }
    case "confirmExpected": {
      const row = snapshot.tables.transactions.get(mutation.args.id);
      if (!row) return null;
      if (row.status === "expected") return unconfirm(snapshot, row, createId);
      if (!mutation.args.patch) return [];
      return [
        {
          name: "updateTransaction",
          args: {
            id: row.id,
            patch: previousPatch(snapshot, row, mutation.args.patch),
          },
        },
      ];
    }
    case "putValuation": {
      const { accountId, on } = mutation.args;
      const existing = [...snapshot.tables.valuations.values()].find(
        (row) =>
          row.accountId === accountId &&
          row.on === on &&
          row.deletedAt === null,
      );
      if (!existing) {
        return [{ name: "deleteValuation", args: { id: mutation.args.id } }];
      }
      return [
        {
          name: "putValuation",
          args: {
            id: existing.id,
            accountId,
            on,
            amountMinor: existing.amountMinor,
            note: existing.note,
          },
        },
      ];
    }
    case "deleteValuation": {
      const row = snapshot.tables.valuations.get(mutation.args.id);
      if (!row || row.deletedAt !== null) return [];
      return [
        {
          name: "putValuation",
          args: {
            id: row.id,
            accountId: row.accountId,
            on: row.on,
            amountMinor: row.amountMinor,
            note: row.note,
          },
        },
      ];
    }
    case "setFxRate": {
      const { base, quote, on } = mutation.args;
      const row = snapshot.tables.fxRates.get(`${base}|${quote}|${on}`);
      if (!row) return null;
      return [{ name: "setFxRate", args: { base, quote, on, rate: row.rate } }];
    }
    case "mergePayee": {
      return null;
    }
    case "upsertAccount":
    case "upsertGroup":
    case "upsertCategory":
    case "upsertPayee":
    case "upsertTag":
    case "upsertRule": {
      return inverseUpsert(snapshot, mutation);
    }
    case "upsertMember": {
      const member = snapshot.tables.members.get(mutation.args.id);
      if (!member) return null;
      return [
        { name: "upsertMember", args: { id: member.id, name: member.name } },
      ];
    }
  }
}
