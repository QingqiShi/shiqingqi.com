import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { MAX_INSTRUCTION_LINE_LENGTH } from "../settings/max-ai-instructions-length.ts";
import { findInstructionLine } from "./apply-instruction-change.ts";
import type { InstructionChange, NamedLabels } from "./types.ts";

const MAX_OUTPUT_TOKENS = 4000;

const RULES = `You keep a household's instructions for the AI that labels the household's bank rows. A member of the household corrected the labels that the AI gave one bank row. Draft the smallest change to the instructions that would have made the AI choose the member's labels.

Rules:
1. Usually add one new line, with replaces set to null. When a line of the instructions led the AI to its labels, or says something that the member's labels contradict, change that line instead: put it in replaces exactly as it is written, and put the changed line in line.
2. Never restate what the instructions already say.
3. Write a rule for every row like this one, not a note about this one row. Name the merchant, or the words of the bank text that identify such rows, and the labels that the member chose. Leave out the date and the amount unless they decide the labels.
4. Say only the labels that the member changed, and the others only when the line needs them to be clear. Name a category by its path, and accounts, members, payees and tags by name.
5. Write one short line in the language and the style of the instructions, or in English when there are none.`;

export interface CorrectedRow {
  date: string;
  /** Signed, in the account's currency: money out is negative. */
  amountMinor: number;
  currency: string;
  account: string;
  merchant: string;
  description: string;
}

export interface CorrectionToTeach {
  instructions: string;
  row: CorrectedRow;
  aiReason: string | null;
  ai: NamedLabels;
  member: NamedLabels;
}

const outputSchema = z.object({
  replaces: z.string().nullable(),
  line: z.string(),
});

function describeLabels(labels: NamedLabels) {
  return [
    `kind ${labels.kind}`,
    `category ${labels.category ?? "none"}`,
    `payee ${labels.payee ?? "none"}`,
    `tags ${labels.tags.length === 0 ? "none" : labels.tags.join(", ")}`,
    `member ${labels.member ?? "none"}`,
    `accounts ${labels.accounts.join(", ") || "none"}`,
  ].join("; ");
}

function describeCorrection(correction: CorrectionToTeach) {
  const { row } = correction;
  const bankRow = [
    row.date,
    `${minorUnitsToDecimalString(row.amountMinor, row.currency)} ${row.currency}`,
    row.account,
    row.merchant || "-",
    row.description || "-",
  ].join(" | ");
  return `The household's instructions:
<instructions>
${correction.instructions.trim() || "(none)"}
</instructions>

The bank row (date | amount | account | merchant | description):
${bankRow}

The AI's labels: ${describeLabels(correction.ai)}
The AI's reason: ${correction.aiReason?.trim() || "(none)"}
The member's labels: ${describeLabels(correction.member)}`;
}

/**
 * Asks the model for the smallest change to the AI instructions that would
 * have given the Member's labels: usually one new line, else a changed line.
 * A `replaces` that is not a line of the instructions becomes an added line.
 * A failing call or an empty line throws.
 */
export async function draftInstructionChange(
  model: LanguageModel,
  correction: CorrectionToTeach,
): Promise<InstructionChange> {
  const result = await generateText({
    model,
    output: Output.object({ schema: outputSchema }),
    reasoning: "low",
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    instructions: RULES,
    messages: [{ role: "user", content: describeCorrection(correction) }],
  });
  const line = result.output.line
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INSTRUCTION_LINE_LENGTH);
  if (line === "") throw new Error("The model drafted an empty line");
  const index = findInstructionLine(
    correction.instructions,
    result.output.replaces,
  );
  return {
    replaces:
      index === -1 ? null : correction.instructions.split("\n")[index].trim(),
    line,
  };
}
