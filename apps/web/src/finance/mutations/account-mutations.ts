import {
  institutionDomainOf,
  institutionFieldsAfter,
} from "../domain/accounts/institution-fields-after.ts";
import { sideOfKind } from "../domain/accounts/side-of-kind.ts";
import { isSupportedCurrency } from "../exchange-rates/supported-currencies.ts";
import {
  checkSystemAccountPatch,
  checkSystemAccountValuation,
} from "../sync/check-system-account-patch.ts";
import { MutationError } from "../sync/mutation-error.ts";
import {
  accountFieldsSchema,
  accountGroupFieldsSchema,
} from "../sync/mutation-schema.ts";
import { parseNewRow } from "../sync/parse-new-row.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { invalid } from "./invalid.ts";
import { stampAfter } from "./stamp-after.ts";
import { touchAccount } from "./touch-account.ts";
import type { MutationArgs, MutationScope } from "./types.ts";
import { absent } from "./wait-for-server.ts";

function isLiveAccount(scope: MutationScope, id: string) {
  const account = scope.draft.get("accounts", id);
  return account !== undefined && account.deletedAt === null;
}

/** A live Entry, Valuation or Bank link keeps an account from deletion. */
function isAccountInUse(scope: MutationScope, accountId: string) {
  const { draft } = scope;
  return (
    draft.hasLive("entries", { accountId }) ||
    draft.hasLive("valuations", { accountId }) ||
    draft.hasLive("bankLinks", { accountId })
  );
}

/** The new account the fields describe, with the defaults of every field they leave out. */
function newAccount(
  scope: MutationScope,
  id: string,
  fields: Omit<MutationArgs<"upsertAccount">, "id" | "deleted">,
): AccountRow {
  const { context } = scope;
  return {
    id,
    householdId: context.householdId,
    ownerMemberId: null,
    institution: "",
    institutionDomain: null,
    guessedInstitutionDomain: null,
    institutionIconVersion: null,
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    isSystem: false,
    ...parseNewRow(
      accountFieldsSchema
        .partial()
        .required({ groupId: true, name: true, kind: true, currency: true }),
      fields,
    ),
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  };
}

/**
 * The icon version of the domain the account shows after the change. A
 * draft that cannot tell keeps the version while that domain stays, and
 * drops it while the server finds the icon of a new one.
 */
function iconVersionAfter(
  scope: MutationScope,
  after: AccountRow,
  existing: AccountRow | undefined,
) {
  const domain = institutionDomainOf(after);
  if (domain === null) return null;
  const known = scope.draft.institutionIconVersion(domain);
  if (known !== undefined) return known;
  return existing && domain === institutionDomainOf(existing)
    ? existing.institutionIconVersion
    : null;
}

function upsertAccount(
  scope: MutationScope,
  args: MutationArgs<"upsertAccount">,
) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("accounts", id);
  if (existing?.isSystem) checkSystemAccountPatch(fields, deleted);
  const merged = existing
    ? {
        ...existing,
        ...fields,
        ...institutionFieldsAfter(existing, fields),
        updatedAt: context.now,
        deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
      }
    : newAccount(scope, id, fields);

  if (!existing || fields.groupId !== undefined || fields.kind !== undefined) {
    const group = draft.get("accountGroups", merged.groupId);
    if (!group || group.deletedAt) invalid("Unknown group");
    if (group.side !== sideOfKind(merged.kind)) {
      invalid(`A ${merged.kind} account cannot go in a ${group.side} group`);
    }
  }
  if (
    fields.currency !== undefined &&
    fields.currency !== existing?.currency &&
    !isSupportedCurrency(fields.currency) &&
    fields.currency !== context.baseCurrency
  ) {
    invalid("Finance supports only the currencies the ECB publishes rates for");
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
  if (existing && deleted && !existing.deletedAt && isAccountInUse(scope, id)) {
    invalid(
      "Transactions, valuations or a Bank link still use the account; close it",
    );
  }
  draft.put("accounts", id, {
    ...merged,
    institutionIconVersion: iconVersionAfter(scope, merged, existing),
  });
}

function upsertGroup(scope: MutationScope, args: MutationArgs<"upsertGroup">) {
  const { draft, context } = scope;
  const { id, deleted, ...fields } = args;
  const existing = draft.get("accountGroups", id);
  if (existing) {
    const kinds =
      fields.side !== undefined || deleted
        ? draft
            .where("accounts", { groupId: id })
            .filter((account) => account.deletedAt === null)
            .map((account) => account.kind)
        : [];
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
      deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
    });
    return;
  }
  draft.put("accountGroups", id, {
    id,
    householdId: context.householdId,
    position: 0,
    ...parseNewRow(
      accountGroupFieldsSchema.partial().required({ name: true, side: true }),
      fields,
    ),
    version: 0,
    createdAt: context.now,
    updatedAt: context.now,
    deletedAt: null,
  });
}

/**
 * Sets the balance of an account at the end of a day. A Valuation already on
 * that day is replaced. A value equal to the balance the account already has
 * writes nothing, so confirming a balance costs nothing.
 */
function putValuation(
  scope: MutationScope,
  args: MutationArgs<"putValuation">,
) {
  const { draft, context } = scope;
  const account = draft.get("accounts", args.accountId);
  if (!account || account.deletedAt !== null) invalid("Unknown account");
  checkSystemAccountValuation(account);

  const existing = draft
    .where("valuations", { accountId: args.accountId, on: args.on })
    .find((row) => !row.deletedAt);
  if (existing) {
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
      source: "manual",
      updatedAt: context.now,
    });
  } else {
    if (draft.balanceAt(args.accountId, args.on) === args.amountMinor) return;
    const previous = draft.get("valuations", args.id);
    if (
      previous &&
      (previous.accountId !== args.accountId || previous.on !== args.on)
    ) {
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
      createdAt: previous?.createdAt ?? context.now,
      updatedAt: context.now,
      deletedAt: null,
    });
  }
  touchAccount(scope, args.accountId, args.on);
}

function deleteValuation(scope: MutationScope, id: string) {
  const existing =
    scope.draft.get("valuations", id) ??
    absent(scope.draft, "valuations", new MutationError("not_found"));
  if (existing.deletedAt) return;
  scope.draft.put("valuations", id, {
    ...existing,
    deletedAt: scope.context.now,
    updatedAt: scope.context.now,
  });
  touchAccount(scope, existing.accountId, existing.on);
}

export const accountMutations = {
  upsertAccount,
  upsertGroup,
  putValuation,
  deleteValuation,
};
