import { z } from "zod";
import { ruleTemplateSchema } from "../rules/rule-template-schema.ts";
import {
  accountKindSchema,
  categoryKindSchema,
  groupSideSchema,
  ruleUnitSchema,
  transactionKindSchema,
} from "./row-schemas.ts";
import { wireFields } from "./wire-fields.ts";

const { id, day, minorUnits, currency, name, note, position, text, fxRate } =
  wireFields;

const entryInputSchema = z.object({
  id,
  accountId: id,
  amountMinor: minorUnits,
  fxRate: fxRate.nullable().default(null),
});

const transactionFields = z.object({
  kind: transactionKindSchema,
  date: day,
  amountMinor: minorUnits,
  categoryId: id.nullable(),
  payeeId: id.nullable(),
  memberId: id.nullable(),
  refundOfId: id.nullable(),
  note,
  needsReview: z.boolean(),
  entries: z.array(entryInputSchema).min(1).max(20),
  tagIds: z.array(id).max(50),
});

/** A whole new Transaction with its Entries and Tags. */
const transactionInputSchema = z.object({
  ...transactionFields.shape,
  id,
  status: z.enum(["posted", "expected"]).default("posted"),
  ruleId: id.nullable().default(null),
  categoryId: id.nullable().default(null),
  payeeId: id.nullable().default(null),
  memberId: id.nullable().default(null),
  refundOfId: id.nullable().default(null),
  note: note.default(""),
  needsReview: z.boolean().default(false),
  tagIds: z.array(id).max(50).default([]),
});

/** The fields to change. `entries` and `tagIds` replace the whole set. */
const transactionPatchSchema = transactionFields.partial();

const deleted = z.boolean().optional();

export const accountFieldsSchema = z.object({
  groupId: id,
  ownerMemberId: id.nullable(),
  name,
  institution: text(200),
  kind: accountKindSchema,
  currency,
  excludedFromNetWorth: z.boolean(),
  closedOn: day.nullable(),
  position,
  creditLimitMinor: minorUnits.nullable(),
  statementDay: z.int().min(1).max(31).nullable(),
  paymentDueDay: z.int().min(1).max(31).nullable(),
  defaultPaymentAccountId: id.nullable(),
});

export const accountGroupFieldsSchema = z.object({
  name,
  side: groupSideSchema,
  position,
});

export const categoryFieldsSchema = z.object({
  parentId: id.nullable(),
  kind: categoryKindSchema,
  name,
  emoji: text(16),
  color: text(32),
  position,
  archived: z.boolean(),
});

export const payeeFieldsSchema = z.object({
  name,
  note,
  defaultCategoryId: id.nullable(),
  defaultAccountId: id.nullable(),
  addAliases: z.array(name).max(50),
});

export const tagFieldsSchema = z.object({ name, position });

export const ruleFieldsSchema = z.object({
  name,
  unit: ruleUnitSchema,
  interval: z.int().min(1).max(99),
  dayOfMonth: z.int().min(1).max(31).nullable(),
  weekday: z.int().min(1).max(7).nullable(),
  monthOfYear: z.int().min(1).max(12).nullable(),
  startsOn: day,
  endsOn: day.nullable(),
  nextOn: day,
  autoPost: z.boolean(),
  template: ruleTemplateSchema,
  paused: z.boolean(),
});

/** An upsert carries the id and only the fields to change. */
function upsertArgs<Shape extends z.ZodRawShape>(fields: z.ZodObject<Shape>) {
  return z.object({ ...fields.partial().shape, id, deleted });
}

export const upsertAccountArgsSchema = upsertArgs(accountFieldsSchema);
export const upsertAccountGroupArgsSchema = upsertArgs(
  accountGroupFieldsSchema,
);
export const upsertCategoryArgsSchema = upsertArgs(categoryFieldsSchema);
export const upsertPayeeArgsSchema = upsertArgs(payeeFieldsSchema);
export const upsertTagArgsSchema = upsertArgs(tagFieldsSchema);
export const upsertRuleArgsSchema = upsertArgs(ruleFieldsSchema);

export const putValuationArgsSchema = z.object({
  id,
  accountId: id,
  on: day,
  amountMinor: minorUnits,
  note: note.optional(),
});

export const setFxRateArgsSchema = z
  .object({
    base: currency,
    quote: currency,
    on: day,
    rate: fxRate,
  })
  .refine((args) => args.base !== args.quote, "base and quote must differ");

export const mergePayeeArgsSchema = z
  .object({ fromId: id, intoId: id })
  .refine((args) => args.fromId !== args.intoId, "cannot merge into itself");

const byId = z.object({ id });

function mutation<Name extends string, Args extends z.ZodType>(
  mutationName: Name,
  args: Args,
) {
  return z.object({ id, name: z.literal(mutationName), args });
}

/** Every change a client can push. */
export const mutationSchema = z.discriminatedUnion("name", [
  mutation("createTransaction", transactionInputSchema),
  mutation(
    "updateTransaction",
    z.object({ id, patch: transactionPatchSchema }),
  ),
  mutation("deleteTransaction", byId),
  mutation("restoreTransaction", byId),
  mutation(
    "confirmExpected",
    z.object({ id, patch: transactionPatchSchema.optional() }),
  ),
  mutation("skipExpected", byId),
  mutation("putValuation", putValuationArgsSchema),
  mutation("deleteValuation", byId),
  mutation("upsertAccount", upsertAccountArgsSchema),
  mutation("upsertGroup", upsertAccountGroupArgsSchema),
  mutation("upsertCategory", upsertCategoryArgsSchema),
  mutation("upsertPayee", upsertPayeeArgsSchema),
  mutation("upsertTag", upsertTagArgsSchema),
  mutation("upsertRule", upsertRuleArgsSchema),
  mutation("mergePayee", mergePayeeArgsSchema),
  mutation("setFxRate", setFxRateArgsSchema),
  mutation("upsertMember", z.object({ id, name })),
]);

export type Mutation = z.infer<typeof mutationSchema>;
export type MutationName = Mutation["name"];
export type MutationInput = z.input<typeof mutationSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionPatch = z.infer<typeof transactionPatchSchema>;
export type EntryInput = z.infer<typeof entryInputSchema>;
