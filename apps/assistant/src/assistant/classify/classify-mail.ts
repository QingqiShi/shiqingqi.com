import { generateText, Output } from "ai";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import type { MailBucket, UserLocale } from "#src/assistant/db/schema.ts";
import {
  classifyPrompt,
  type ClassifyOutput,
  type MailForPrompt,
} from "./classify-prompt.ts";
import { decideBucket } from "./decide-bucket.ts";
import { matchSenderRule } from "./match-sender-rule.ts";
import { readDueDate, readEvent } from "./read-event.ts";
import { readHeaderRules, type MailForRules } from "./read-header-rules.ts";
import type { MailEvent, MailFacts, SenderRule } from "./types.ts";

const MAX_OUTPUT_TOKENS = 2000;
const MAX_SUMMARY_LENGTH = 300;

export type MailToClassify = MailForPrompt & MailForRules;

/** What classification needs to know of the user. */
export interface ClassifyContext {
  categories: readonly { id: string; name: string }[];
  /** Confirmed rules only. */
  senderRules: readonly SenderRule[];
  /** The user has replied to the sender before. */
  knownCorrespondent: boolean;
  locale: UserLocale;
  timeZone: string;
}

export interface Classification {
  bucket: MailBucket;
  categoryId: string | null;
  decidedBy: "rule" | "sender_rule" | "model";
  reason: string;
  senderRuleId: string | null;
  facts: MailFacts | null;
  summary: string | null;
  event: MailEvent | null;
  modelId: string | null;
  promptVersion: number | null;
}

/** One structured call: the facts, the summary line and the event of one mail. */
export async function askClassifier(
  model: AssistantModel,
  mail: MailToClassify,
  context: Pick<ClassifyContext, "categories" | "locale" | "timeZone">,
): Promise<ClassifyOutput> {
  const categoryNames = context.categories.map((category) => category.name);
  const result = await generateText({
    model: model.model,
    output: Output.object({
      schema: classifyPrompt.outputSchema(categoryNames),
    }),
    reasoning: "low",
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    instructions: classifyPrompt.instructions(context.locale),
    messages: [
      {
        role: "user",
        content: classifyPrompt.describeMail(mail, {
          categoryNames,
          timeZone: context.timeZone,
        }),
      },
    ],
  });
  return result.output;
}

/**
 * Classifies one mail: the header rules first, then the model, then the
 * truth table. It is null when the mail needs the model and there is none.
 * A failing model call throws.
 */
export async function classifyMail(
  mail: MailToClassify,
  context: ClassifyContext,
  model: AssistantModel | null,
): Promise<Classification | null> {
  const { signals, rule } = readHeaderRules(mail);
  if (rule) {
    return {
      bucket: "fyi",
      categoryId: null,
      decidedBy: "rule",
      reason: `rule:${rule}`,
      senderRuleId: null,
      facts: null,
      summary: null,
      event: null,
      modelId: null,
      promptVersion: null,
    };
  }
  if (!model) return null;

  const { summary, event, ...answers } = await askClassifier(
    model,
    mail,
    context,
  );
  const facts: MailFacts = {
    ...answers,
    dueDate: readDueDate(answers.dueDate),
  };
  const senderRule = matchSenderRule(mail.fromAddress, context.senderRules);
  const decision = decideBucket({
    facts,
    signals,
    knownCorrespondent: context.knownCorrespondent,
    senderRule,
  });
  const modelCategory =
    context.categories.find((category) => category.name === facts.category)
      ?.id ?? null;
  const line = summary.replaceAll(/\s+/g, " ").trim();
  return {
    bucket: decision.bucket,
    categoryId: senderRule?.categoryId ?? modelCategory,
    decidedBy: senderRule ? "sender_rule" : "model",
    reason: decision.reason,
    senderRuleId: senderRule?.id ?? null,
    facts,
    summary: line === "" ? null : line.slice(0, MAX_SUMMARY_LENGTH),
    event: readEvent(event, context.timeZone),
    modelId: model.id,
    promptVersion: classifyPrompt.version,
  };
}
