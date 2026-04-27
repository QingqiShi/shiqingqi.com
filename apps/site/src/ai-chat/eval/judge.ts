import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { throttle } from "./throttle";
import type { ToolCallSummary } from "./types";

const JUDGE_MODEL = "claude-sonnet-4-6";

let cachedModel: LanguageModel | null = null;

function getJudgeModel(): LanguageModel {
  if (!cachedModel) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    cachedModel = anthropic.chat(JUDGE_MODEL);
  }
  return cachedModel;
}

const SYSTEM_PROMPT = `You are an evaluation judge for an AI movie recommendation assistant.
Given a user message, assistant response, and evaluation criteria, judge if ALL criteria are met.
Respond with ONLY valid JSON: { "pass": boolean, "reasoning": string }
Do not include any other text outside the JSON.`;

const judgeSchema = z.object({
  pass: z.boolean(),
  reasoning: z.string(),
});

function formatToolCalls(toolCalls: ToolCallSummary[]) {
  return toolCalls
    .map((tc) => `- ${tc.toolName}(${JSON.stringify(tc.args)})`)
    .join("\n");
}

async function callJudge(
  content: string,
  criteria: string[],
  toolCalls?: ToolCallSummary[],
) {
  const criteriaList = criteria.map((c) => `- ${c}`).join("\n");
  let prompt = `${content}\n\nEvaluation criteria:\n${criteriaList}`;

  if (toolCalls && toolCalls.length > 0) {
    prompt += `\n\nTool calls made:\n${formatToolCalls(toolCalls)}`;
  }

  await throttle.waitIfNeeded();
  const result = await generateText({
    model: getJudgeModel(),
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: judgeSchema }),
  });
  throttle.record(result.usage.totalTokens ?? 0);

  return result.output;
}

export async function judge({
  userMessage,
  response,
  criteria,
  toolCalls,
}: {
  userMessage: string;
  response: string;
  criteria: string[];
  toolCalls?: ToolCallSummary[];
}) {
  return callJudge(
    `User message: ${userMessage}\n\nAssistant response: ${response}`,
    criteria,
    toolCalls,
  );
}

export async function judgeConversation({
  transcript,
  criteria,
  toolCalls,
}: {
  transcript: string;
  criteria: string[];
  toolCalls?: ToolCallSummary[];
}) {
  return callJudge(
    `Conversation transcript:\n${transcript}`,
    criteria,
    toolCalls,
  );
}
