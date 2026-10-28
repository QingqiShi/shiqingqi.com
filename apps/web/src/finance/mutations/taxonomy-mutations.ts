import { MutationError } from "../sync/mutation-error.ts";
import {
  categoryFieldsSchema,
  payeeFieldsSchema,
  tagFieldsSchema,
  upsertCategoryArgsSchema,
  upsertPayeeArgsSchema,
  upsertTagArgsSchema,
} from "../sync/mutation-schema.ts";
import { parseNewRow } from "../sync/parse-new-row.ts";
import type { CategoryRow } from "../sync/row-schemas.ts";
import { invalid } from "./invalid.ts";
import { previousUpsertArgs } from "./previous-upsert-args.ts";
import { read } from "./read.ts";
import { stampAfter } from "./stamp-after.ts";
import type { MutationArgs, MutationScope, MutationSpecs } from "./types.ts";

const MAX_CATEGORY_DEPTH = 32;

/** Checks that `parentId` is a live Category of the same kind and is not `id` or one of its children. */
function checkParent(
  scope: MutationScope,
  id: string,
  kind: CategoryRow["kind"],
  parentId: string,
) {
  let cursor: string | null = parentId;
  for (let depth = 0; cursor !== null; depth++) {
    if (cursor === id || depth > MAX_CATEGORY_DEPTH) {
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

/** A live Transaction or child Category keeps a Category from deletion. */
function isCategoryInUse(scope: MutationScope, id: string) {
  return (
    scope.draft.hasLive("transactions", { categoryId: id }) ||
    scope.draft.hasLive("categories", { parentId: id })
  );
}

function upsertCategory(
  scope: MutationScope,
  args: MutationArgs<"upsertCategory">,
) {
  const { draft, context } = scope;
  const { id, deleted, archived, ...fields } = args;
  const archivedAt = (current: string | null) =>
    stampAfter(archived, current, context.now);
  const existing = draft.get("categories", id);
  if (existing) {
    if (fields.kind !== undefined && fields.kind !== existing.kind) {
      invalid("A category keeps its kind");
    }
    if (fields.parentId) checkParent(scope, id, existing.kind, fields.parentId);
    if (deleted && !existing.deletedAt) {
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
      deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
    });
    return;
  }
  const row = parseNewRow(
    categoryFieldsSchema
      .omit({ archived: true })
      .partial()
      .required({ kind: true, name: true }),
    fields,
  );
  if (row.parentId) checkParent(scope, id, row.kind, row.parentId);
  draft.put("categories", id, {
    id,
    householdId: context.householdId,
    parentId: null,
    emoji: "",
    color: "",
    position: 0,
    isSystem: false,
    ...row,
    archivedAt: archivedAt(null),
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  });
}

function checkPayeeDefaults(
  scope: MutationScope,
  fields: {
    defaultCategoryId?: string | null;
    defaultAccountId?: string | null;
  },
) {
  const { draft } = scope;
  if (fields.defaultCategoryId) {
    const category = draft.get("categories", fields.defaultCategoryId);
    if (!category || category.deletedAt) invalid("Unknown category");
  }
  if (fields.defaultAccountId) {
    const account = draft.get("accounts", fields.defaultAccountId);
    if (!account || account.deletedAt) invalid("Unknown account");
  }
}

function upsertPayee(scope: MutationScope, args: MutationArgs<"upsertPayee">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  checkPayeeDefaults(scope, fields);
  const existing = draft.get("payees", id);
  if (existing) {
    if (existing.mergedIntoId) {
      throw new MutationError("deleted", "The payee was merged");
    }
    draft.put("payees", id, {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
    });
    return;
  }
  draft.put("payees", id, {
    id,
    householdId: context.householdId,
    note: "",
    defaultCategoryId: null,
    defaultAccountId: null,
    ...parseNewRow(
      payeeFieldsSchema.partial().required({ name: true }),
      fields,
    ),
    mergedIntoId: null,
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  });
}

function namesPayee(template: unknown, payeeId: string) {
  return (
    typeof template === "object" &&
    template !== null &&
    "payeeId" in template &&
    template.payeeId === payeeId
  );
}

/**
 * Folds one Payee into another: its Transactions and Rule templates move to
 * the other Payee, and it is soft-deleted with a pointer to where it went.
 */
function mergePayee(scope: MutationScope, args: MutationArgs<"mergePayee">) {
  const { draft, context } = scope;
  const from = draft.get("payees", args.fromId);
  const into = draft.get("payees", args.intoId);
  if (!from || !into) throw new MutationError("not_found");
  if (from.deletedAt || into.deletedAt) throw new MutationError("deleted");

  for (const transaction of draft.where("transactions", { payeeId: from.id })) {
    draft.put("transactions", transaction.id, {
      ...transaction,
      payeeId: into.id,
      updatedAt: context.now,
    });
  }
  for (const rule of draft.where("rules", {})) {
    if (!namesPayee(rule.template, from.id)) continue;
    draft.put("rules", rule.id, {
      ...rule,
      template: { ...rule.template, payeeId: into.id },
      updatedAt: context.now,
    });
  }
  draft.put("payees", from.id, {
    ...from,
    mergedIntoId: into.id,
    updatedAt: context.now,
    deletedAt: context.now,
  });
}

function upsertTag(scope: MutationScope, args: MutationArgs<"upsertTag">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("tags", id);
  if (existing) {
    draft.put("tags", id, {
      ...existing,
      ...fields,
      updatedAt: context.now,
      deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
    });
    return;
  }
  draft.put("tags", id, {
    id,
    householdId: context.householdId,
    position: 0,
    ...parseNewRow(tagFieldsSchema.partial().required({ name: true }), fields),
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  });
}

/** Renames a Member, or adds one without a user when the id is new. */
function upsertMember(
  scope: MutationScope,
  args: MutationArgs<"upsertMember">,
) {
  const { draft, context } = scope;
  const existing = draft.get("members", args.id);
  if (!existing) {
    draft.put("members", args.id, {
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
  draft.put("members", args.id, {
    ...existing,
    name: args.name,
    updatedAt: context.now,
  });
}

export const taxonomyMutations = {
  upsertCategory: {
    reads: [
      ({ id, deleted }) => [
        read.where("categories", {}),
        deleted ? read.hasLive("transactions", { categoryId: id }) : undefined,
      ],
    ],
    apply: upsertCategory,
    inverse: (snapshot, args) => [
      {
        name: "upsertCategory",
        args: previousUpsertArgs(
          snapshot.tables.categories.get(args.id),
          args,
          upsertCategoryArgsSchema,
        ),
      },
    ],
  },
  upsertPayee: {
    reads: [
      ({ id, defaultCategoryId, defaultAccountId }) => [
        read.get("payees", [id]),
        read.get("categories", [defaultCategoryId]),
        read.get("accounts", [defaultAccountId]),
      ],
    ],
    apply: upsertPayee,
    inverse: (snapshot, args) => [
      {
        name: "upsertPayee",
        args: previousUpsertArgs(
          snapshot.tables.payees.get(args.id),
          args,
          upsertPayeeArgsSchema,
        ),
      },
    ],
  },
  mergePayee: {
    reads: [
      ({ fromId, intoId }) => [
        read.get("payees", [fromId, intoId]),
        read.where("transactions", { payeeId: fromId }),
        read.where("rules", {}),
      ],
    ],
    apply: mergePayee,
    inverse: () => null,
  },
  upsertTag: {
    reads: [({ id }) => [read.get("tags", [id])]],
    apply: upsertTag,
    inverse: (snapshot, args) => [
      {
        name: "upsertTag",
        args: previousUpsertArgs(
          snapshot.tables.tags.get(args.id),
          args,
          upsertTagArgsSchema,
        ),
      },
    ],
  },
  upsertMember: {
    reads: [({ id }) => [read.get("members", [id])]],
    apply: upsertMember,
    inverse: (snapshot, { id }) => {
      const member = snapshot.tables.members.get(id);
      if (!member) return null;
      return [
        { name: "upsertMember", args: { id: member.id, name: member.name } },
      ];
    },
  },
} satisfies Partial<MutationSpecs>;
