import { readFileSync } from "fs";
import { join } from "path";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import "server-only";
import { z } from "zod";
import type { SupportedLocale } from "@/types";
import type { MediaListItem } from "@/utils/types";
import { OPENAI_MODEL, openaiClient } from "./client";
import { availableTools, executeToolCall } from "./tools";

// MediaListItem schema matching the type structure
const MediaListItemSchema = z.object({
  id: z.number(),
  title: z.string().optional().nullable(),
  posterPath: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
});

// Agent response schema - array of MediaListItem
const AgentResponseSchema = z.object({
  media_list: z.array(MediaListItemSchema),
});

interface AgentResponse {
  items: MediaListItem[];
  error?: string;
}

function getSystemInstructions(locale: SupportedLocale): string {
  const instructionsPath = join(
    process.cwd(),
    "src",
    "ai",
    "system-instructions.md",
  );
  const template = readFileSync(instructionsPath, "utf-8");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString("en-US", { month: "long" });
  const currentDate = now.toISOString().split("T")[0];

  return template
    .replace("{currentDate}", currentDate)
    .replace("{locale}", locale)
    .replace("{currentMonth}", currentMonth)
    .replace("{currentYear}", currentYear.toString());
}

export async function agent(
  userMessage: string,
  locale: SupportedLocale = "en",
): Promise<AgentResponse> {
  try {
    const instructions = getSystemInstructions(locale);
    const initialMessages = [
      {
        role: "developer" as const,
        content: instructions,
      },
      {
        role: "user" as const,
        content: userMessage,
      },
    ];

    const fullConversation: ResponseInput = [...initialMessages];

    // Phase 1: Tool calling loop
    let toolCallingComplete = false;
    const maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    while (!toolCallingComplete && iteration < maxIterations) {
      console.log("fullConversation", fullConversation);
      const response = await openaiClient.responses.create({
        model: OPENAI_MODEL,
        input: fullConversation,
        tools: availableTools,
      });

      if (response.status !== "completed") {
        return {
          items: [],
          error: `Tool calling phase failed: ${response.status}`,
        };
      }

      let hasToolCalls = false;
      let hasMessage = false;

      for (const outputItem of response.output) {
        const item = outputItem as {
          type: string;
          content?: string;
          name?: string;
          arguments?: string;
          call_id?: string;
        };

        if (item.type === "function_call") {
          hasToolCalls = true;

          console.log("arguments", item.arguments);

          try {
            // Auto-inject language parameter based on locale
            const toolArgs = JSON.parse(item.arguments || "{}") as Record<
              string,
              unknown
            >;

            if (!toolArgs.language) {
              toolArgs.language = locale === "zh" ? "zh-CN" : "en-US";
            }

            fullConversation.push({
              type: "function_call",
              call_id: item.call_id!,
              name: item.name!,
              arguments: item.arguments ?? "",
            });

            const result = await executeToolCall({
              name: item.name!,
              arguments: JSON.stringify(toolArgs),
              call_id: item.call_id!,
            });

            // Add tool result to conversation
            fullConversation.push({
              type: "function_call_output",
              call_id: item.call_id!,
              output: JSON.stringify(result.result),
            });
          } catch (error) {
            console.error("Tool execution error:", error);
            // Add error result to conversation
            fullConversation.push({
              type: "function_call_output",
              call_id: item.call_id!,
              output: JSON.stringify({
                error: `Failed to execute ${item.name}`,
              }),
            });
          }
        } else if (item.type === "message" && item.content) {
          hasMessage = true;
          // Add AI's response to conversation
          fullConversation.push({
            role: "assistant",
            content: item.content,
          });
        }
      }

      // Detection: AI is done with tools if it sent a message without more tool calls
      if (hasMessage && !hasToolCalls) {
        toolCallingComplete = true;
      }

      iteration++;
    }

    // Phase 2: Structured output for final processing
    const finalResponse = await openaiClient.responses.parse({
      model: OPENAI_MODEL,
      input: [
        ...fullConversation,
        {
          role: "developer",
          content:
            "Based on all the TMDB data retrieved, provide a final filtered and ranked list of recommendations that best match the user's original query. Consider relevance, ratings, diversity, and user preferences. Return only the most relevant results.",
        },
      ],
      text: {
        format: zodTextFormat(AgentResponseSchema, "media_list"),
      },
    });

    if (finalResponse.status !== "completed") {
      return {
        items: [],
        error: `Structured output phase failed: ${finalResponse.status}`,
      };
    }

    const parsed = finalResponse.output_parsed;
    if (!parsed) {
      return {
        items: [],
        error: "No parsed output available from final processing",
      };
    }

    return {
      items: parsed.media_list,
    };
  } catch (error) {
    console.error("Error in AI agent:", error);

    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
