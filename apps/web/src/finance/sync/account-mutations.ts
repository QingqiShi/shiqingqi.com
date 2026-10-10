import type { z } from "zod";
import { accountGroupRepository } from "../db/repositories/account-group-repository.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { fxRateRepository } from "../db/repositories/fx-rate-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import {
  valuationRepository,
  type ValuationSource,
} from "../db/repositories/valuation-repository.ts";
import { sideOfKind } from "../domain/accounts/side-of-kind.ts";
import { MutationError } from "./mutation-error.ts";
import {
  accountFieldsSchema,
  accountGroupFieldsSchema,
  type putValuationArgsSchema,
  type setFxRateArgsSchema,
  type upsertAccountArgsSchema,
  type upsertAccountGroupArgsSchema,
} from "./mutation-schema.ts";
import { parseNewRow } from "./parse-new-row.ts";
import type { WriteContext } from "./types.ts";

async function upsertAccount(
  context: WriteContext,
  args: z.infer<typeof upsertAccountArgsSchema>,
) {
  const { scope } = context;
  const { id, deleted, ...fields } = args;
  const existing = await accountRepository.findById(scope, id);
  const merged = existing
    ? { ...existing, ...fields }
    : parseNewRow(
        accountFieldsSchema
          .partial()
          .required({ groupId: true, name: true, kind: true, currency: true }),
        fields,
      );

  if (!existing || fields.groupId !== undefined || fields.kind !== undefined) {
    const group = await accountGroupRepository.findById(scope, merged.groupId);
    if (!group || group.deletedAt) {
      throw new MutationError("invalid", "Unknown group");
    }
    if (group.side !== sideOfKind(merged.kind)) {
      throw new MutationError(
        "invalid",
        `A ${merged.kind} account cannot go in a ${group.side} group`,
      );
    }
  }
  if (fields.ownerMemberId) {
    const owner = await memberRepository.findById(scope, fields.ownerMemberId);
    if (!owner) throw new MutationError("invalid", "Unknown member");
  }
  if (fields.defaultPaymentAccountId) {
    const active = await accountRepository.findActiveIds(scope, [
      fields.defaultPaymentAccountId,
    ]);
    if (active.size === 0)
      throw new MutationError("invalid", "Unknown account");
  }

  if (
    existing &&
    deleted &&
    !existing.deletedAt &&
    (await accountRepository.isInUse(scope, id))
  ) {
    throw new MutationError(
      "invalid",
      "Transactions, valuations or a Bank link still use the account; close it",
    );
  }

  if (existing) {
    await accountRepository.patch(scope, id, { ...fields, deleted });
  } else if (!(await accountRepository.insert(scope, { ...merged, id }))) {
    throw new MutationError("forbidden");
  }
}

async function upsertGroup(
  context: WriteContext,
  args: z.infer<typeof upsertAccountGroupArgsSchema>,
) {
  const { scope } = context;
  const { id, deleted, ...fields } = args;
  const existing = await accountGroupRepository.findById(scope, id);
  if (existing) {
    const kinds =
      fields.side !== undefined || deleted
        ? await accountRepository.findKindsInGroup(scope, id)
        : [];
    if (deleted && kinds.length > 0) {
      throw new MutationError("invalid", "The group still holds accounts");
    }
    if (fields.side && kinds.some((kind) => sideOfKind(kind) !== fields.side)) {
      throw new MutationError(
        "invalid",
        "The group holds accounts of the other side",
      );
    }
    await accountGroupRepository.patch(scope, id, { ...fields, deleted });
    return;
  }
  const row = parseNewRow(
    accountGroupFieldsSchema.partial().required({ name: true, side: true }),
    fields,
  );
  if (!(await accountGroupRepository.insert(scope, { ...row, id }))) {
    throw new MutationError("forbidden");
  }
}

/**
 * Sets the balance of an account at the end of a day. A Valuation already on
 * that day is replaced. A value equal to the balance the account already has
 * writes nothing, so confirming a balance costs nothing.
 */
async function putValuation(
  context: WriteContext,
  args: z.infer<typeof putValuationArgsSchema>,
  source: ValuationSource = "manual",
) {
  const { scope } = context;
  const active = await accountRepository.findActiveIds(scope, [args.accountId]);
  if (active.size === 0) throw new MutationError("invalid", "Unknown account");

  const existing = await valuationRepository.findByAccountOn(
    scope,
    args.accountId,
    args.on,
  );
  if (existing && !existing.deletedAt) {
    if (
      existing.amountMinor === args.amountMinor &&
      (args.note === undefined || args.note === existing.note)
    ) {
      return;
    }
    await valuationRepository.patch(scope, existing.id, {
      amountMinor: args.amountMinor,
      note: args.note,
      source,
    });
  } else {
    const balance = await valuationRepository.balanceAt(
      scope,
      args.accountId,
      args.on,
    );
    if (balance === args.amountMinor) return;
    if (existing) {
      await valuationRepository.patch(scope, existing.id, {
        amountMinor: args.amountMinor,
        note: args.note ?? "",
        source,
        deleted: false,
      });
    } else if (
      !(await valuationRepository.insert(scope, { ...args, source }))
    ) {
      const sameId = await valuationRepository.findById(scope, args.id);
      throw sameId
        ? new MutationError("invalid", "The valuation id is in use")
        : new MutationError("forbidden");
    }
  }
  context.touches.account(args.accountId, args.on);
}

async function deleteValuation(context: WriteContext, id: string) {
  const existing = await valuationRepository.findById(context.scope, id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  await valuationRepository.patch(context.scope, id, { deleted: true });
  context.touches.account(existing.accountId, existing.on);
}

async function setFxRate(
  context: WriteContext,
  args: z.infer<typeof setFxRateArgsSchema>,
) {
  await fxRateRepository.put(context.scope, args);
}

export const accountMutations = {
  upsertAccount,
  upsertGroup,
  putValuation,
  deleteValuation,
  setFxRate,
};
