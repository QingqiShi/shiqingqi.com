import { z } from "zod";
import { wireFields } from "../sync/wire-fields.ts";

/** What a Rule writes into each Transaction it produces. */
export const ruleTemplateSchema = z.object({
  kind: z.enum(["expense", "income", "transfer"]),
  amountMinor: wireFields.minorUnits,
  categoryId: wireFields.id.nullable().default(null),
  payeeId: wireFields.id.nullable().default(null),
  memberId: wireFields.id.nullable().default(null),
  note: wireFields.note.default(""),
  entries: z
    .array(
      z.object({
        accountId: wireFields.id,
        amountMinor: wireFields.minorUnits,
      }),
    )
    .min(1)
    .max(20),
  tagIds: z.array(wireFields.id).max(50).default([]),
});

export type RuleTemplate = z.infer<typeof ruleTemplateSchema>;
