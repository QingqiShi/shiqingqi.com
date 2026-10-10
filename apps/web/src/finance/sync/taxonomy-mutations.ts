import { eq } from "drizzle-orm";
import type { z } from "zod";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { categoryRepository } from "../db/repositories/category-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { tagRepository } from "../db/repositories/tag-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { transactions } from "../db/schema.ts";
import { MutationError } from "./mutation-error.ts";
import {
  categoryFieldsSchema,
  payeeFieldsSchema,
  tagFieldsSchema,
  type mergePayeeArgsSchema,
  type upsertCategoryArgsSchema,
  type upsertPayeeArgsSchema,
  type upsertTagArgsSchema,
} from "./mutation-schema.ts";
import { parseNewRow } from "./parse-new-row.ts";
import type { WriteContext } from "./types.ts";

const MAX_CATEGORY_DEPTH = 32;

/** Checks that `parentId` is a live Category of the same kind and is not `id` or one of its children. */
async function checkParent(
  scope: RepositoryScope,
  id: string,
  kind: "expense" | "income",
  parentId: string,
) {
  let cursor: string | null = parentId;
  for (let depth = 0; cursor !== null; depth++) {
    if (cursor === id || depth > MAX_CATEGORY_DEPTH) {
      throw new MutationError("invalid", "A category cannot be its own parent");
    }
    const parent = await categoryRepository.findById(scope, cursor);
    if (!parent || parent.deletedAt) {
      throw new MutationError("invalid", "Unknown parent category");
    }
    if (parent.kind !== kind) {
      throw new MutationError("invalid", "The parent is of the other kind");
    }
    cursor = parent.parentId;
  }
}

async function upsertCategory(
  context: WriteContext,
  args: z.infer<typeof upsertCategoryArgsSchema>,
) {
  const { scope } = context;
  const { id, deleted, archived, ...fields } = args;
  const existing = await categoryRepository.findById(scope, id);
  if (existing) {
    if (fields.kind !== undefined && fields.kind !== existing.kind) {
      throw new MutationError("invalid", "A category keeps its kind");
    }
    if (fields.parentId) {
      await checkParent(scope, id, existing.kind, fields.parentId);
    }
    if (deleted && !existing.deletedAt) {
      if (existing.isSystem) {
        throw new MutationError("invalid", "A system category stays");
      }
      if (await categoryRepository.isInUse(scope, id)) {
        throw new MutationError(
          "invalid",
          "Transactions or subcategories still use the category; archive it",
        );
      }
    }
    await categoryRepository.patch(scope, id, { ...fields, archived, deleted });
    if (fields.name !== undefined && fields.name !== existing.name) {
      await transactionRepository.refreshSearchText(
        scope,
        eq(transactions.categoryId, id),
      );
    }
    return;
  }
  const row = parseNewRow(
    categoryFieldsSchema.partial().required({ kind: true, name: true }),
    fields,
  );
  if (row.parentId) await checkParent(scope, id, row.kind, row.parentId);
  if (!(await categoryRepository.insert(scope, { ...row, id }))) {
    throw new MutationError("forbidden");
  }
  if (archived) await categoryRepository.patch(scope, id, { archived });
}

async function checkPayeeDefaults(
  scope: RepositoryScope,
  fields: {
    defaultCategoryId?: string | null;
    defaultAccountId?: string | null;
  },
) {
  if (fields.defaultCategoryId) {
    const category = await categoryRepository.findById(
      scope,
      fields.defaultCategoryId,
    );
    if (!category || category.deletedAt) {
      throw new MutationError("invalid", "Unknown category");
    }
  }
  if (fields.defaultAccountId) {
    const active = await accountRepository.findActiveIds(scope, [
      fields.defaultAccountId,
    ]);
    if (active.size === 0)
      throw new MutationError("invalid", "Unknown account");
  }
}

async function upsertPayee(
  context: WriteContext,
  args: z.infer<typeof upsertPayeeArgsSchema>,
) {
  const { scope } = context;
  const { id, deleted, addAliases, ...fields } = args;
  await checkPayeeDefaults(scope, fields);
  const existing = await payeeRepository.findById(scope, id);
  if (existing) {
    if (existing.mergedIntoId) {
      throw new MutationError("deleted", "The payee was merged");
    }
    await payeeRepository.patch(scope, id, { ...fields, deleted });
    if (fields.name !== undefined && fields.name !== existing.name) {
      await transactionRepository.refreshSearchText(
        scope,
        eq(transactions.payeeId, id),
      );
    }
  } else {
    const row = parseNewRow(
      payeeFieldsSchema
        .omit({ addAliases: true })
        .partial()
        .required({ name: true }),
      fields,
    );
    if (!(await payeeRepository.insert(scope, { ...row, id }))) {
      throw new MutationError("forbidden");
    }
  }
  await payeeRepository.putAliases(scope, id, addAliases ?? []);
}

/**
 * Folds one Payee into another: its Transactions, aliases and Rule templates
 * move to the other Payee, and it is soft-deleted with a pointer to where it
 * went.
 */
async function mergePayee(
  context: WriteContext,
  args: z.infer<typeof mergePayeeArgsSchema>,
) {
  const { scope } = context;
  const from = await payeeRepository.findById(scope, args.fromId);
  const into = await payeeRepository.findById(scope, args.intoId);
  if (!from || !into) throw new MutationError("not_found");
  if (from.deletedAt || into.deletedAt) throw new MutationError("deleted");

  await transactionRepository.repointPayee(scope, from.id, into.id);
  await payeeRepository.repointAliases(scope, from.id, into.id);
  await ruleRepository.repointTemplatePayee(scope, from.id, into.id);
  await payeeRepository.patch(scope, from.id, {
    mergedIntoId: into.id,
    deleted: true,
  });
  await transactionRepository.refreshSearchText(
    scope,
    eq(transactions.payeeId, into.id),
  );
}

async function upsertTag(
  context: WriteContext,
  args: z.infer<typeof upsertTagArgsSchema>,
) {
  const { scope } = context;
  const { id, deleted, ...fields } = args;
  const existing = await tagRepository.findById(scope, id);
  if (existing) {
    await tagRepository.patch(scope, id, { ...fields, deleted });
    return;
  }
  const row = parseNewRow(
    tagFieldsSchema.partial().required({ name: true }),
    fields,
  );
  if (!(await tagRepository.insert(scope, { ...row, id }))) {
    throw new MutationError("forbidden");
  }
}

/** Renames a Member, or adds one without a user when the id is new. */
async function upsertMember(
  context: WriteContext,
  args: { id: string; name: string },
) {
  const existing = await memberRepository.findById(context.scope, args.id);
  if (!existing) {
    if (!(await memberRepository.insert(context.scope, args))) {
      throw new MutationError("forbidden");
    }
    return;
  }
  if (existing.name !== args.name) {
    await memberRepository.rename(context.scope, args.id, args.name);
  }
}

export const taxonomyMutations = {
  upsertCategory,
  upsertPayee,
  mergePayee,
  upsertTag,
  upsertMember,
};
