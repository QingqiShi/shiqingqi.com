import {
  draftRowRepository,
  type DraftTableName,
  type LiveTableName,
} from "../db/repositories/draft-row-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import { institutionCacheRepository } from "../institutions/institution-cache-repository.ts";
import type { MutationCall } from "../mutations/apply-to-draft.ts";
import type { MutationArgs } from "../mutations/types.ts";
import type { ReplicaRow } from "../replica/types.ts";
import type { StrictDraft } from "./create-strict-draft.ts";
import type { TransactionInput, TransactionPatch } from "./mutation-schema.ts";

interface Loader {
  scope: RepositoryScope;
  strict: StrictDraft;
}

function present(values: readonly (string | null | undefined)[]) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

async function loadKeys(
  { scope, strict }: Loader,
  table: DraftTableName,
  wanted: readonly (string | null | undefined)[],
) {
  const sought = present(wanted);
  if (sought.length === 0) return;
  strict.addKeys(
    table,
    sought,
    await draftRowRepository.select(scope, table, { keys: sought }),
  );
}

async function loadSet<Table extends DraftTableName>(
  { scope, strict }: Loader,
  table: Table,
  match: Partial<ReplicaRow<Table>>,
) {
  strict.addSet(
    table,
    match,
    await draftRowRepository.select(scope, table, { match }),
  );
}

/** The Entries of each of these Transactions, in one query. */
async function loadEntriesOf(
  { scope, strict }: Loader,
  transactionIds: readonly string[],
) {
  const found = await draftRowRepository.select(scope, "entries", {
    field: "transactionId",
    in: transactionIds,
  });
  for (const transactionId of transactionIds) {
    strict.addSet(
      "entries",
      { transactionId },
      found.filter((row) => row.transactionId === transactionId),
    );
  }
}

async function loadHasLive(
  { scope, strict }: Loader,
  table: LiveTableName,
  match: Readonly<Record<string, unknown>>,
) {
  strict.addHasLive(
    table,
    match,
    await draftRowRepository.hasLive(scope, table, match),
  );
}

/** A Transaction with its Entries and Tag links, deleted ones included. */
async function loadTransaction(loader: Loader, id: string) {
  await Promise.all([
    loadKeys(loader, "transactions", [id]),
    loadSet(loader, "entries", { transactionId: id }),
    loadSet(loader, "transactionTags", { transactionId: id }),
  ]);
}

/** The rows that `checkTransactionRows` may look up for a Transaction of this shape. */
export async function loadNamedRows(
  loader: Loader,
  shape: {
    categoryId?: string | null;
    payeeId?: string | null;
    memberId?: string | null;
    refundOfId?: string | null;
    ruleId?: string | null;
    entries: readonly { id?: string; accountId: string }[];
    tagIds: readonly string[];
  },
) {
  await Promise.all([
    loadKeys(loader, "categories", [shape.categoryId]),
    loadKeys(
      loader,
      "accounts",
      shape.entries.map((entry) => entry.accountId),
    ),
    loadKeys(
      loader,
      "entries",
      shape.entries.map((entry) => entry.id),
    ),
    loadKeys(loader, "tags", shape.tagIds),
    loadKeys(loader, "payees", [shape.payeeId]),
    loadKeys(loader, "members", [shape.memberId]),
    loadKeys(loader, "transactions", [shape.refundOfId]),
    loadKeys(loader, "rules", [shape.ruleId]),
  ]);
}

async function loadCreate(loader: Loader, input: TransactionInput) {
  await Promise.all([
    loadTransaction(loader, input.id),
    loadNamedRows(loader, input),
  ]);
}

async function loadUpdate(
  loader: Loader,
  id: string,
  patch: TransactionPatch | undefined,
) {
  await loadTransaction(loader, id);
  const existing = loader.strict.draft.get("transactions", id);
  if (!existing || !patch) return;
  await loadNamedRows(loader, {
    ...existing,
    ...patch,
    entries: patch.entries ?? [],
    tagIds: patch.tagIds ?? [],
  });
}

async function loadPutValuation(
  loader: Loader,
  args: MutationArgs<"putValuation">,
) {
  const { accountId, on } = args;
  await Promise.all([
    loadKeys(loader, "accounts", [accountId]),
    loadKeys(loader, "valuations", [args.id]),
    loadSet(loader, "valuations", { accountId, on }),
  ]);
  const { draft } = loader.strict;
  if (
    draft.where("valuations", { accountId, on }).some((row) => !row.deletedAt)
  ) {
    return;
  }
  loader.strict.addBalanceAt(
    accountId,
    on,
    await valuationRepository.balanceAt(loader.scope, accountId, on),
  );
}

async function loadUpsertAccount(
  loader: Loader,
  args: MutationArgs<"upsertAccount">,
) {
  const { scope, strict } = loader;
  await Promise.all([
    loadKeys(loader, "accounts", [args.id, args.defaultPaymentAccountId]),
    loadKeys(loader, "members", [args.ownerMemberId]),
  ]);
  const existing = strict.draft.get("accounts", args.id);
  const domains = present([
    args.institutionDomain,
    existing?.institutionDomain,
    existing?.guessedInstitutionDomain,
  ]);
  const [versions] = await Promise.all([
    institutionCacheRepository.findIconVersions(scope.db, domains),
    loadKeys(loader, "accountGroups", [args.groupId ?? existing?.groupId]),
    ...(existing && args.deleted
      ? (["entries", "valuations", "bankLinks"] as const).map((table) =>
          loadHasLive(loader, table, { accountId: args.id }),
        )
      : []),
  ]);
  for (const domain of domains) {
    strict.addInstitutionIconVersion(domain, versions.get(domain) ?? null);
  }
}

/** Loads the rows `mutation` reads into `strict`, and the context it needs. */
export async function loadMutationRows(
  scope: RepositoryScope,
  strict: StrictDraft,
  mutation: MutationCall,
): Promise<void> {
  const loader: Loader = { scope, strict };
  switch (mutation.name) {
    case "createTransaction": {
      await loadCreate(loader, mutation.args);
      return;
    }
    case "updateTransaction": {
      await loadUpdate(loader, mutation.args.id, mutation.args.patch);
      return;
    }
    case "confirmExpected": {
      await loadUpdate(loader, mutation.args.id, mutation.args.patch);
      return;
    }
    case "deleteTransaction":
    case "restoreTransaction":
    case "skipExpected": {
      await loadTransaction(loader, mutation.args.id);
      return;
    }
    case "putValuation": {
      await loadPutValuation(loader, mutation.args);
      return;
    }
    case "deleteValuation": {
      await loadKeys(loader, "valuations", [mutation.args.id]);
      return;
    }
    case "upsertAccount": {
      await loadUpsertAccount(loader, mutation.args);
      return;
    }
    case "upsertGroup": {
      const { id, side, deleted } = mutation.args;
      await Promise.all([
        loadKeys(loader, "accountGroups", [id]),
        side !== undefined || deleted
          ? loadSet(loader, "accounts", { groupId: id })
          : undefined,
      ]);
      return;
    }
    case "upsertCategory": {
      const { id, deleted } = mutation.args;
      await Promise.all([
        loadSet(loader, "categories", {}),
        deleted
          ? loadHasLive(loader, "transactions", { categoryId: id })
          : undefined,
      ]);
      return;
    }
    case "upsertPayee": {
      const { id, defaultCategoryId, defaultAccountId } = mutation.args;
      await Promise.all([
        loadKeys(loader, "payees", [id]),
        loadKeys(loader, "categories", [defaultCategoryId]),
        loadKeys(loader, "accounts", [defaultAccountId]),
      ]);
      return;
    }
    case "mergePayee": {
      const { fromId, intoId } = mutation.args;
      await Promise.all([
        loadKeys(loader, "payees", [fromId, intoId]),
        loadSet(loader, "transactions", { payeeId: fromId }),
        loadSet(loader, "rules", {}),
      ]);
      return;
    }
    case "upsertTag": {
      await loadKeys(loader, "tags", [mutation.args.id]);
      return;
    }
    case "upsertMember": {
      await loadKeys(loader, "members", [mutation.args.id]);
      return;
    }
    case "upsertRule": {
      const { id, template, deleted } = mutation.args;
      await Promise.all([
        loadKeys(loader, "rules", [id]),
        template ? loadNamedRows(loader, template) : undefined,
        deleted
          ? loadSet(loader, "transactions", { ruleId: id, status: "expected" })
          : undefined,
      ]);
      if (deleted) {
        const expected = strict.draft.where("transactions", {
          ruleId: id,
          status: "expected",
        });
        await loadEntriesOf(
          loader,
          expected.map((row) => row.id),
        );
      }
      return;
    }
  }
}
