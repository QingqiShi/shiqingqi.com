import { generateText, Output } from "ai";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import type { DigestArranger, UserLocale } from "#src/assistant/db/schema.ts";
import { digestPrompt, type DigestPromptOutput } from "./digest-prompt.ts";
import {
  fallbackOrder,
  groupByThread,
  type DigestMail,
  type MailThread,
} from "./group-by-thread.ts";
import { DIGEST_SECTIONS, perSection } from "./per-section.ts";
import { type DigestGroup, type DigestSection } from "./types.ts";

const MAX_OUTPUT_TOKENS = 6000;
const MODEL_TIMEOUT_MS = 90_000;
const MAX_LINE_LENGTH = 300;

export interface DigestArrangement {
  headline: string | null;
  sections: Record<DigestSection, DigestGroup[]>;
  arrangedBy: DigestArranger;
  modelId: string | null;
  promptVersion: number | null;
}

function toGroup(thread: MailThread, line: string | null): DigestGroup {
  return {
    ids: thread.map((mail) => mail.classificationId),
    line,
    carriedOver: thread.some((mail) => mail.carriedOver),
  };
}

function cleanLine(value: string): string | null {
  const line = value.replaceAll(/\s+/g, " ").trim();
  return line === "" ? null : line.slice(0, MAX_LINE_LENGTH);
}

function threadsBySection(mails: readonly DigestMail[]) {
  const threads = groupByThread(mails);
  return perSection((section) =>
    fallbackOrder(
      section,
      threads.filter((thread) => thread[0].section === section),
    ),
  );
}

/**
 * Puts the model's order and lines onto the threads. The model cannot drop,
 * add or move an item: an unknown key is ignored, a repeated key counts
 * once, and an item the model left out follows in the code's order.
 */
export function applyModelOrder(
  bySection: Record<DigestSection, MailThread[]>,
  keyed: ReadonlyMap<string, MailThread>,
  output: DigestPromptOutput,
): Record<DigestSection, DigestGroup[]> {
  const placed = new Set<string>();
  const ordered = new Map<DigestSection, DigestGroup[]>(
    DIGEST_SECTIONS.map((section) => [section, []]),
  );
  for (const { key, line } of output.items) {
    const thread = keyed.get(key);
    if (!thread || placed.has(key)) continue;
    placed.add(key);
    ordered.get(thread[0].section)?.push(toGroup(thread, cleanLine(line)));
  }
  const keyOf = new Map([...keyed].map(([key, thread]) => [thread, key]));
  return perSection((section) => [
    ...(ordered.get(section) ?? []),
    ...bySection[section]
      .filter((thread) => !placed.has(keyOf.get(thread) ?? ""))
      .map((thread) => toGroup(thread, null)),
  ]);
}

/**
 * Arranges the digest's mail: merged by thread, most urgent first, with
 * one sentence per item and a headline. When there is no model, or its
 * call fails, the code orders the items and the page uses each summary.
 */
export async function arrangeDigest({
  mails,
  model,
  locale,
  today,
}: {
  mails: readonly DigestMail[];
  model: AssistantModel | null;
  locale: UserLocale;
  today: string;
}): Promise<DigestArrangement> {
  const bySection = threadsBySection(mails);
  const fallback: DigestArrangement = {
    headline: null,
    sections: perSection((section) =>
      bySection[section].map((thread) => toGroup(thread, null)),
    ),
    arrangedBy: "fallback",
    modelId: null,
    promptVersion: null,
  };
  if (!model || mails.length === 0) return fallback;

  const keyed = new Map<string, MailThread>(
    DIGEST_SECTIONS.flatMap((section) => bySection[section]).map(
      (thread, index) => [`m${String(index + 1)}`, thread],
    ),
  );
  try {
    const result = await generateText({
      model: model.model,
      output: Output.object({ schema: digestPrompt.outputSchema }),
      reasoning: "low",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      instructions: digestPrompt.instructions(locale),
      messages: [
        {
          role: "user",
          content: digestPrompt.describeItems(
            [...keyed].map(([key, thread]) => ({ key, thread })),
            today,
          ),
        },
      ],
    });
    return {
      headline: cleanLine(result.output.headline),
      sections: applyModelOrder(bySection, keyed, result.output),
      arrangedBy: "model",
      modelId: model.id,
      promptVersion: digestPrompt.version,
    };
  } catch (error) {
    console.error(
      "Digest arrangement failed",
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}
