import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { cleanPayeeName } from "./clean-payee-name.ts";
import { findSimilarTransactions } from "./find-similar-transactions.ts";
import { bankTextHistory, withUsualPayee } from "./labels-for-bank-text.ts";
import { matchPayee } from "./match-payee.ts";
import { normaliseBankText } from "./normalise-bank-text.ts";
import { readTagHistory } from "./read-tag-history.ts";
import type { LabelInput, LabelMemory, Suggestion } from "./types.ts";

/** The most inputs one model call labels. */
export const MODEL_BATCH_SIZE = 20;
const MAX_PAYEES_IN_PROMPT = 400;
const MAX_OUTPUT_TOKENS = 4096;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ModelLabelInput extends LabelInput {
  /** Identifies the input in the result map. */
  key: string;
}

const INSTRUCTIONS = `You label bank transactions for a household finance app. The household keeps its own category tree, tags, members and payees; they are listed below with their ids.

For each numbered bank transaction, return:
- index: the number of the transaction.
- payeeName: the merchant or person on the other side, short and in normal capitalisation ("Tesco", "Deliveroo", "TfL", "Netflix"). When an existing payee is the same merchant, return its exact name. For a delivery platform or marketplace, name the platform ("DELIVEROO*KFC" is "Deliveroo"). Never include store numbers, card numbers, towns or reference codes.
- categoryId: exactly one id from the category list. Prefer a child category over its parent when one fits. Money out (a negative amount) takes an expense category. Money in from a shop is a refund: give it the expense category of the purchase. Use an income category only for money earned or received (salary, interest, gifts). Use the uncategorised category only when nothing fits.
- tagIds: ids from the tag list, only for a tag that every similar past transaction with the same payee or bank text and the same category carries (a ride tag on every taxi ride). Never guess a tag that changes from one transaction to the next, such as the restaurant of a food delivery or who a treat was for: only the household knows it. Usually an empty list.
- memberId: the member who most likely made the transaction when the similar past transactions show it, else null.
- confidence: a number from 0 to 1 that says how sure you are of the category.
- reason: a few words on why.

The similar past transactions show how the household labelled bank rows like these. When one has the same or nearly the same bank text, give the same payee and category, unless the amount shows a different kind of purchase. When past transactions with the same bank text have different categories, compare the amount and the weekday with theirs to find which kind this one is, and give a confidence below 0.8 when they do not show it. When those past transactions have no payee, return an empty payeeName.

Return one result for every transaction.`;

interface Paths {
  pathOf: (categoryId: string) => string;
}

function dayText(date: string) {
  return `${date} ${WEEKDAYS[weekdayOf(date) - 1] ?? ""}`;
}

function categoryPaths(memory: Pick<LabelMemory, "categories">): Paths {
  const byId = new Map(
    memory.categories.map((category) => [category.id, category]),
  );
  function pathOf(categoryId: string): string {
    const names: string[] = [];
    let current = byId.get(categoryId);
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current =
        current.parentId === null ? undefined : byId.get(current.parentId);
    }
    return names.join(" > ");
  }
  return { pathOf };
}

/** The part of the prompt that stays the same for a Household between calls, so the provider can cache it. */
function householdContext(memory: LabelMemory, paths: Paths) {
  const categories = memory.categories
    .map(
      (category) =>
        `${category.id} | ${category.kind} | ${paths.pathOf(category.id)}`,
    )
    .join("\n");
  const tags =
    memory.tags.map((tag) => `${tag.id} | ${tag.name}`).join("\n") || "(none)";
  const members =
    memory.members
      .map((member) => `${member.id} | ${member.name}`)
      .join("\n") || "(none)";
  const payees =
    memory.payees
      .slice(0, MAX_PAYEES_IN_PROMPT)
      .map((payee) =>
        payee.defaultCategoryId
          ? `${payee.name} → ${paths.pathOf(payee.defaultCategoryId)}`
          : payee.name,
      )
      .join("\n") || "(none)";
  return `${INSTRUCTIONS}

Categories (id | kind | path):
${categories}

Tags (id | name):
${tags}

Members (id | name):
${members}

Existing payees (name → usual category):
${payees}`;
}

function describeBatch(
  inputs: readonly ModelLabelInput[],
  memory: LabelMemory,
  paths: Paths,
) {
  const payeeNames = new Map(
    memory.payees.map((payee) => [payee.id, payee.name]),
  );
  const tagNames = new Map(memory.tags.map((tag) => [tag.id, tag.name]));
  const accounts = new Map(
    memory.accounts.map((account) => [account.id, account]),
  );
  const { baseCurrency } = memory;

  const similar = findSimilarTransactions(inputs, memory).map((transaction) =>
    [
      dayText(transaction.date),
      transaction.bankTexts.length > 0 ? `"${transaction.bankTexts[0]}"` : "",
      transaction.payeeId ? (payeeNames.get(transaction.payeeId) ?? "") : "",
      transaction.categoryId ? paths.pathOf(transaction.categoryId) : "",
      transaction.tagIds.map((id) => tagNames.get(id) ?? "").join(", "),
      minorUnitsToDecimalString(transaction.amountMinor, baseCurrency),
    ].join(" · "),
  );

  const lines = inputs.map((input, index) => {
    const account = accounts.get(input.accountId);
    const currency = account?.currency ?? baseCurrency;
    const accountText = account
      ? `${account.name} (${account.kind})`
      : "unknown account";
    return `${String(index)}. ${dayText(input.date)} · ${minorUnitsToDecimalString(input.amountMinor, currency)} ${currency} · ${accountText} · "${input.text}"`;
  });

  return `Similar past transactions (date · bank text · payee · category · tags · amount):
${similar.join("\n") || "(none)"}

Bank transactions to label:
${lines.join("\n")}`;
}

function outputSchema(categoryIds: readonly string[]) {
  const [first, ...rest] = categoryIds;
  return z.object({
    results: z.array(
      z.object({
        index: z.int(),
        payeeName: z.string(),
        categoryId: z.enum([first, ...rest]),
        tagIds: z.array(z.string()),
        memberId: z.string().nullable(),
        confidence: z.number(),
        reason: z.string(),
      }),
    ),
  });
}

function findPayeeByName(name: string, memory: LabelMemory) {
  const lower = name.trim().toLowerCase();
  const byName = memory.payees.find(
    (payee) => payee.name.trim().toLowerCase() === lower,
  );
  if (byName) return byName.id;
  const normalised = normaliseBankText(name);
  return memory.aliases.find((alias) => alias.alias === normalised)?.payeeId;
}

/**
 * Drops each Tag that changes between the past Transactions with the same
 * bank text or Payee and the same Category, and asks for Tags when the user
 * nearly always adds such a Tag (see `readTagHistory`).
 */
function guardTags(
  suggestion: Suggestion,
  input: LabelInput,
  memory: LabelMemory,
): Suggestion {
  const sameSign = (amountMinor: number) =>
    Math.sign(amountMinor) === Math.sign(input.amountMinor);
  const histories = [
    bankTextHistory(input, memory),
    suggestion.payeeId === undefined
      ? []
      : memory.transactions.filter(
          (transaction) =>
            transaction.payeeId === suggestion.payeeId &&
            transaction.kind !== "transfer" &&
            sameSign(transaction.amountMinor),
        ),
  ].map((history) =>
    readTagHistory(
      history.filter(
        (transaction) => transaction.categoryId === suggestion.categoryId,
      ),
    ),
  );
  const guarded: Suggestion = {
    ...suggestion,
    tagIds: suggestion.tagIds.filter((tagId) =>
      histories.every((history) => !history.varying.has(tagId)),
    ),
  };
  if (histories.some((history) => history.askForTags)) {
    guarded.askForTags = true;
  }
  return guarded;
}

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * Step 3 of the labelling pipeline: asks the model for the labels of up to
 * 20 inputs per call. The Household's categories, tags, members and payees
 * go in the cached instructions; the past Transactions and the inputs go in
 * the message. A Payee that an alias names is kept over the model's name,
 * and so is the usual Payee, or none, of past bank rows with the same text
 * and Category.
 * A Tag that the history shows to change between occurrences is dropped.
 */
export async function suggestLabelsWithModel(
  model: LanguageModel,
  memory: LabelMemory,
  inputs: readonly ModelLabelInput[],
): Promise<Map<string, Suggestion>> {
  const suggestions = new Map<string, Suggestion>();
  const categoryIds = memory.categories.map((category) => category.id);
  if (inputs.length === 0 || categoryIds.length === 0) return suggestions;

  const paths = categoryPaths(memory);
  const instructions = householdContext(memory, paths);
  const schema = outputSchema(categoryIds);
  const tagIds = new Set(memory.tags.map((tag) => tag.id));
  const memberIds = new Set(memory.members.map((member) => member.id));
  const owners = new Map(
    memory.accounts.map((account) => [account.id, account.ownerMemberId]),
  );

  for (let start = 0; start < inputs.length; start += MODEL_BATCH_SIZE) {
    const batch = inputs.slice(start, start + MODEL_BATCH_SIZE);
    const result = await generateText({
      model,
      output: Output.object({ schema }),
      reasoning: "none",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      instructions: {
        role: "system",
        content: instructions,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      messages: [
        { role: "user", content: describeBatch(batch, memory, paths) },
      ],
    });

    for (const labelled of result.output.results) {
      const input = batch.at(labelled.index);
      if (!input || suggestions.has(input.key)) continue;
      const known = matchPayee(input.text, memory) ?? undefined;
      const usual = withUsualPayee(
        bankTextHistory(input, memory).filter(
          (transaction) => transaction.categoryId === labelled.categoryId,
        ),
      );
      const payeeName = cleanPayeeName(labelled.payeeName);
      const named = usual ? undefined : findPayeeByName(payeeName, memory);
      const payeeId = known ?? (usual ? (usual.payeeId ?? undefined) : named);
      const newPayeeName =
        known === undefined &&
        usual === undefined &&
        named === undefined &&
        payeeName !== ""
          ? payeeName
          : undefined;
      const memberId =
        labelled.memberId !== null && memberIds.has(labelled.memberId)
          ? labelled.memberId
          : (owners.get(input.accountId) ?? undefined);
      suggestions.set(
        input.key,
        guardTags(
          {
            payeeId,
            newPayeeName,
            categoryId: labelled.categoryId,
            tagIds: [...new Set(labelled.tagIds)].filter((id) =>
              tagIds.has(id),
            ),
            memberId,
            confidence: clamp(labelled.confidence),
            source: "model",
          },
          input,
          memory,
        ),
      );
    }
  }
  return suggestions;
}
