import { generateText, isStepCount, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { payeeNameKey } from "../domain/payees/payee-name-key.ts";
import { MAX_NOTE_LENGTH } from "../sync/wire-fields.ts";
import { cleanPayeeName } from "./clean-payee-name.ts";
import {
  categoryPathOf,
  describeRows,
  labellerSystemPrompt,
} from "./labeller-system-prompt.ts";
import {
  searchTransactionsTool,
  type SearchTransactions,
} from "./search-transactions-tool.ts";
import type {
  LabellingAccount,
  LabellingContext,
  RowToLabel,
} from "./types.ts";

/** The most bank rows one model call labels. */
export const LABEL_BATCH_SIZE = 20;
/** Steps of one call: searches, then the answer. The last step may not search. */
const MAX_STEPS = 8;
const MAX_OUTPUT_TOKENS = 16_000;
const MAX_REASON_LENGTH = 500;

type TransferTarget =
  | { type: "account"; accountId: string }
  | { type: "pair"; ref: string }
  | { type: "unknown" };

/** The labels the model chose for one bank row, with ids it knows. */
export interface RowLabel {
  kind: "expense" | "income" | "transfer";
  /** Null for a transfer. */
  categoryId: string | null;
  /** A known Payee by id, or a new one by name. Null for a transfer. */
  payee: { id: string } | { name: string } | null;
  tagIds: string[];
  memberId: string | null;
  note: string;
  /** Null unless the kind is transfer. */
  transfer: TransferTarget | null;
  /** A loan or receivable account that takes an opposite Entry. */
  paysDownAccountId: string | null;
  reason: string;
  needsReview: boolean;
}

export type LabelResult =
  { ok: true; label: RowLabel } | { ok: false; problem: string };

function outputSchema(context: LabellingContext) {
  const [first, ...rest] = context.categories.map((category) => category.id);
  const categoryId =
    context.categories.length === 0 ? z.string() : z.enum([first, ...rest]);
  return z.object({
    rows: z.array(
      z.object({
        ref: z.string(),
        kind: z.enum(["expense", "income", "transfer"]),
        categoryId: categoryId.nullable(),
        payeeId: z.string().nullable(),
        newPayeeName: z.string().nullable(),
        tagIds: z.array(z.string()),
        memberId: z.string().nullable(),
        note: z.string(),
        transferAccountId: z.string().nullable(),
        pairRef: z.string().nullable(),
        transferUnknown: z.boolean(),
        paysDownAccountId: z.string().nullable(),
        reason: z.string(),
        needsReview: z.boolean(),
      }),
    ),
  });
}

type ModelRow = z.infer<ReturnType<typeof outputSchema>>["rows"][number];

class Invalid extends Error {}

function check(condition: unknown, problem: string): asserts condition {
  if (!condition) throw new Invalid(problem);
}

function stripRef(ref: string) {
  return ref.trim().replace(/^#/, "");
}

interface Lookup {
  context: LabellingContext;
  rows: Map<string, RowToLabel>;
  accounts: Map<string, LabellingAccount>;
}

function transferOf(answer: ModelRow, row: RowToLabel, lookup: Lookup) {
  const targets = [
    answer.transferAccountId !== null,
    answer.pairRef !== null,
    answer.transferUnknown,
  ].filter(Boolean).length;
  check(targets === 1, "A transfer needs exactly one other side");
  if (answer.transferUnknown) return { type: "unknown" } as const;
  if (answer.pairRef !== null) {
    const ref = stripRef(answer.pairRef);
    const partner = lookup.rows.get(ref);
    check(partner && ref !== row.ref, "Unknown pair");
    check(partner.accountId !== row.accountId, "A pair on one account");
    check(
      Math.sign(partner.amountMinor) === -Math.sign(row.amountMinor),
      "A pair must move money in opposite directions",
    );
    return { type: "pair", ref } as const;
  }
  const account = lookup.accounts.get(answer.transferAccountId ?? "");
  check(account && !account.isSystem, "Unknown transfer account");
  check(account.id !== row.accountId, "A transfer to its own account");
  return { type: "account", accountId: account.id } as const;
}

function payeeOf(answer: ModelRow) {
  if (answer.payeeId !== null) return { id: answer.payeeId };
  const name = cleanPayeeName(answer.newPayeeName ?? "");
  return payeeNameKey(name) === "" ? null : { name };
}

function paysDownOf(answer: ModelRow, row: RowToLabel, lookup: Lookup) {
  if (answer.paysDownAccountId === null) return null;
  const account = lookup.accounts.get(answer.paysDownAccountId);
  const own = lookup.accounts.get(row.accountId);
  check(
    account &&
      !account.isSystem &&
      (account.kind === "loan" || account.kind === "receivable"),
    "paysDownAccountId must be a loan or receivable account",
  );
  check(account.id !== row.accountId, "Pays down its own account");
  check(own?.currency === account.currency, "Pays down another currency");
  return account.id;
}

/** Checks the model's answer for one row against what the Household has. */
function toLabel(answer: ModelRow, row: RowToLabel, lookup: Lookup): RowLabel {
  const { context } = lookup;
  const tagIds = [...new Set(answer.tagIds)];
  const knownTags = new Set(context.tags.map((tag) => tag.id));
  check(
    tagIds.every((id) => knownTags.has(id)),
    "Unknown tag",
  );
  check(
    answer.memberId === null ||
      context.members.some((member) => member.id === answer.memberId),
    "Unknown member",
  );
  const common = {
    kind: answer.kind,
    tagIds,
    memberId: answer.memberId,
    note: answer.note.trim().slice(0, MAX_NOTE_LENGTH),
    reason: answer.reason.trim().slice(0, MAX_REASON_LENGTH),
    needsReview: answer.needsReview,
  };
  if (answer.kind === "transfer") {
    return {
      ...common,
      categoryId: null,
      payee: null,
      transfer: transferOf(answer, row, lookup),
      paysDownAccountId: null,
    };
  }
  const category = context.categories.find(
    (candidate) => candidate.id === answer.categoryId,
  );
  check(category, "An expense or income needs a category");
  check(category.kind === answer.kind, "The category is of another kind");
  check(
    answer.kind === "expense" || row.amountMinor > 0,
    "Money out cannot be an income",
  );
  return {
    ...common,
    categoryId: category.id,
    payee: payeeOf(answer),
    transfer: null,
    paysDownAccountId: paysDownOf(answer, row, lookup),
  };
}

/**
 * Asks the model for the labels of up to 20 bank rows in one call. The
 * model may search past Transactions first. The Household's instructions,
 * accounts, taxonomy, Members and Payees go in the cached system part.
 * Every answer is checked here; a row without a usable answer comes back
 * with the problem. A failing call throws.
 */
export async function labelBankRows(
  model: LanguageModel,
  context: LabellingContext,
  rows: readonly RowToLabel[],
  search: SearchTransactions,
): Promise<Map<string, LabelResult>> {
  const results = new Map<string, LabelResult>();
  if (rows.length === 0) return results;
  const result = await generateText({
    model,
    tools: {
      search_transactions: searchTransactionsTool(
        search,
        categoryPathOf(context),
      ),
    },
    output: Output.object({ schema: outputSchema(context) }),
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) =>
      stepNumber === MAX_STEPS - 1 ? { toolChoice: "none" } : undefined,
    reasoning: "low",
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    instructions: {
      role: "system",
      content: labellerSystemPrompt(context),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    messages: [{ role: "user", content: describeRows(rows, context) }],
  });

  const lookup: Lookup = {
    context,
    rows: new Map(rows.map((row) => [row.ref, row])),
    accounts: new Map(context.accounts.map((account) => [account.id, account])),
  };
  for (const answer of result.output.rows) {
    const row = lookup.rows.get(stripRef(answer.ref));
    if (!row || results.has(row.ref)) continue;
    try {
      results.set(row.ref, { ok: true, label: toLabel(answer, row, lookup) });
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      results.set(row.ref, { ok: false, problem: error.message });
    }
  }
  for (const row of rows) {
    if (!results.has(row.ref)) {
      results.set(row.ref, { ok: false, problem: "No answer" });
    }
  }
  return results;
}
