import { MockLanguageModelV3 } from "ai/test";
import type { TransactionSearch } from "../../db/repositories/transaction-search-repository.ts";

/** One bank row as the mock reads it from the prompt. */
export interface PromptRow {
  ref: string;
  date: string;
  /** In major units, signed, as the prompt shows it. */
  amount: string;
  currency: string;
  accountId: string;
  merchant: string;
  description: string;
}

/** The model's answer for one row; fields left out take a plain default. */
export interface ModelAnswer {
  kind?: "expense" | "income" | "transfer";
  categoryId?: string | null;
  payeeId?: string | null;
  newPayeeName?: string | null;
  tagIds?: string[];
  memberId?: string | null;
  note?: string;
  transferAccountId?: string | null;
  pairRef?: string | null;
  transferUnknown?: boolean;
  paysDownAccountId?: string | null;
  reason?: string;
  needsReview?: boolean;
}

interface PromptMessage {
  role: string;
  content: string | readonly { type: string; text?: string }[];
}

const ROW =
  /^#(\S+) \| (\S+) \| (\S+) (\S+) \| .*\(([0-9a-f-]{36})\) \| (.*) \| (.*)$/gm;

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** The text of the user messages of a prompt. */
export function userText(prompt: readonly PromptMessage[]) {
  return prompt
    .filter((message) => message.role === "user")
    .flatMap((message) =>
      typeof message.content === "string"
        ? [message.content]
        : message.content.map((part) => part.text ?? ""),
    )
    .join("\n");
}

/** The bank rows of a labeller prompt. */
export function promptRows(prompt: readonly PromptMessage[]): PromptRow[] {
  return [...userText(prompt).matchAll(ROW)].map(
    ([, ref, date, amount, currency, accountId, merchant, description]) => ({
      ref,
      date,
      amount,
      currency,
      accountId,
      merchant: merchant === "-" ? "" : merchant,
      description: description === "-" ? "" : description,
    }),
  );
}

/**
 * A mock labeller model. With `search`, its first step calls
 * `search_transactions` with that input; then it answers every bank row of
 * the prompt with what `answer` gives, and leaves out a row it answers null
 * for.
 */
export function createLabellingModel(
  answer: (row: PromptRow) => ModelAnswer | null,
  options: { search?: TransactionSearch } = {},
) {
  return new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const searched = prompt.some((message) => message.role === "tool");
      if (options.search && !searched) {
        return Promise.resolve({
          content: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "search_transactions",
              input: JSON.stringify(options.search),
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool_use" },
          usage: USAGE,
          warnings: [],
        });
      }
      const rows = promptRows(prompt).flatMap((row) => {
        const given = answer(row);
        if (given === null) return [];
        return [
          {
            ref: row.ref,
            kind: "expense",
            categoryId: null,
            payeeId: null,
            newPayeeName: null,
            tagIds: [],
            memberId: null,
            note: "",
            transferAccountId: null,
            pairRef: null,
            transferUnknown: false,
            paysDownAccountId: null,
            reason: "test",
            needsReview: false,
            ...given,
          },
        ];
      });
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify({ rows }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: USAGE,
        warnings: [],
      });
    },
  });
}
