import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import "server-only";
import { z } from "zod";
import type { SupportedLocale } from "@/types";
import type { MediaListItem } from "@/utils/types";
import { getOpenAIClient, getOpenAIModel } from "./client";
import { availableTools, executeToolCall } from "./tools";

// Event type definitions for streaming
export type StreamingEvent =
  | { type: "thinking"; summary: string }
  | { type: "tool_call"; name: string; status: "started" | "completed" }
  | { type: "text_delta"; delta: string }
  | { type: "results"; items: MediaListItem[] }
  | { type: "done" }
  | { type: "error"; message: string; code?: string };

// Client message format (from chat UI)
export interface ClientMessage {
  role: "user" | "assistant";
  content: string;
  results?: MediaListItem[];
}

// MediaListItem schema matching the type structure
const MediaListItemSchema = z.object({
  id: z.number(),
  title: z.string().optional().nullable(),
  posterPath: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  mediaType: z.enum(["movie", "tv"]).optional().nullable(),
});

// Agent response schema - array of MediaListItem
const AgentResponseSchema = z.object({
  media_list: z.array(MediaListItemSchema),
});

// Convert client messages to OpenAI ResponseInput format
// Strips results field, keeps only text content
function convertToResponseInput(
  messages: ClientMessage[],
  systemInstructions: string,
): ResponseInput {
  const conversationHistory: ResponseInput = [
    {
      role: "developer" as const,
      content: systemInstructions,
    },
  ];

  for (const msg of messages) {
    conversationHistory.push({
      role:
        msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    });
  }

  return conversationHistory;
}

export async function* streamingAgent(
  messages: ClientMessage[],
  systemInstructions: string,
  locale: SupportedLocale = "en",
): AsyncGenerator<StreamingEvent, void, unknown> {
  // Validate message count (20 messages max)
  if (messages.length > 20) {
    yield {
      type: "error",
      message: "Conversation limit reached. Maximum 20 messages allowed.",
      code: "MESSAGE_LIMIT_EXCEEDED",
    };
    return;
  }

  try {
    const fullConversation = convertToResponseInput(
      messages,
      systemInstructions,
    );

    // Phase 1: Tool calling loop with streaming
    let toolCallingComplete = false;
    const maxIterations = 5;
    let iteration = 0;

    console.log("Starting streaming agent with", messages.length, "messages");

    while (!toolCallingComplete && iteration < maxIterations) {
      const stream = await getOpenAIClient().responses.create({
        model: getOpenAIModel(),
        input: fullConversation,
        tools: availableTools,
        reasoning: { effort: "low", summary: "auto" },
        text: { verbosity: "low" },
        stream: true,
      });

      let currentThinkingSummary = "";
      const toolCallsMap = new Map<
        string,
        {
          name: string;
          arguments: string;
          call_id: string;
        }
      >();
      let hasCompletionCall = false;
      let completedResponse: {
        output: ResponseInput;
        status: string;
      } | null = null;

      // Process streaming events from OpenAI
      for await (const event of stream) {
        // Handle reasoning summary deltas
        if (event.type === "response.reasoning_summary_text.delta") {
          currentThinkingSummary += event.delta;
          yield {
            type: "thinking",
            summary: currentThinkingSummary,
          };
        }

        // Handle output items (function calls)
        if (event.type === "response.output_item.added") {
          const item = event.item;

          if (item.type === "function_call") {
            console.log("Tool call started:", item.name);

            // Emit tool call started event
            yield {
              type: "tool_call",
              name: item.name,
              status: "started",
            };

            // Check for completion signal
            if (item.name === "complete_phase_1") {
              hasCompletionCall = true;
            }

            // Initialize in map (use item ID for tracking)
            if (item.id) {
              toolCallsMap.set(item.id, {
                name: item.name,
                arguments: "",
                call_id: item.call_id,
              });
            }
          }
        }

        // Handle function call argument deltas
        if (event.type === "response.function_call_arguments.delta") {
          // Accumulate arguments
          const existingCall = toolCallsMap.get(event.item_id);
          if (existingCall) {
            existingCall.arguments += event.delta;
          }
        }

        // Handle response completion
        if (event.type === "response.completed") {
          const response = event.response;

          if (response.status !== "completed") {
            throw new Error(`Tool calling phase failed: ${response.status}`);
          }

          completedResponse = {
            output: response.output,
            status: response.status,
          };
        }
      }

      // Process completed response
      if (completedResponse) {
        const toolCalls: Array<{
          name: string;
          arguments: string;
          call_id: string;
        }> = [];

        // Build tool calls from complete output
        for (const outputItem of completedResponse.output) {
          fullConversation.push(outputItem);

          if (outputItem.type === "function_call") {
            // Auto-inject language parameter based on locale
            const toolArgs = JSON.parse(outputItem.arguments || "{}") as Record<
              string,
              unknown
            >;

            if (!toolArgs.language) {
              toolArgs.language = locale === "zh" ? "zh-CN" : "en-US";
            }

            toolCalls.push({
              name: outputItem.name,
              arguments: JSON.stringify(toolArgs),
              call_id: outputItem.call_id,
            });
          }
        }

        // Execute all tool calls in parallel
        if (toolCalls.length > 0) {
          const results = await Promise.all(
            toolCalls.map(async (toolCall) => {
              try {
                const result = await executeToolCall(toolCall);

                return {
                  success: true,
                  call_id: toolCall.call_id,
                  name: toolCall.name,
                  result: result.result,
                };
              } catch (error) {
                console.error("Tool execution error:", error);
                return {
                  success: false,
                  call_id: toolCall.call_id,
                  name: toolCall.name,
                  error: `Failed to execute ${toolCall.name}`,
                };
              }
            }),
          );

          // Emit tool call completed events after all tools finish
          for (const result of results) {
            if (result.success) {
              yield {
                type: "tool_call",
                name: result.name,
                status: "completed",
              };
            }
          }

          // Add all tool results to conversation
          for (const result of results) {
            fullConversation.push({
              type: "function_call_output",
              call_id: result.call_id,
              output: JSON.stringify(
                result.success ? result.result : { error: result.error },
              ),
            });
          }
        }

        // Check if Phase 1 is complete
        if (hasCompletionCall || toolCalls.length === 0) {
          toolCallingComplete = true;
        }
      }

      iteration++;
    }

    // Phase 2: Structured output (non-streaming for parse)
    // We use non-streaming for Phase 2 because responses.parse doesn't support streaming
    fullConversation.push({
      role: "developer",
      content: "Begin phase 2 and return structured final results",
    });

    const finalResponse = await getOpenAIClient().responses.parse({
      model: getOpenAIModel(),
      input: fullConversation,
      text: {
        format: zodTextFormat(AgentResponseSchema, "media_list"),
      },
    });

    if (finalResponse.status !== "completed") {
      throw new Error(
        `Structured output phase failed: ${finalResponse.status}`,
      );
    }

    const parsed = finalResponse.output_parsed;
    if (!parsed) {
      throw new Error("No parsed output available from final processing");
    }

    // Extract text from output items and stream it character by character
    for (const outputItem of finalResponse.output) {
      if (outputItem.type === "message") {
        // Extract text from message content
        for (const contentPart of outputItem.content) {
          if (contentPart.type === "output_text") {
            const text = contentPart.text;
            // Yield text in chunks to simulate streaming
            const chunkSize = 5; // Send 5 characters at a time
            for (let i = 0; i < text.length; i += chunkSize) {
              yield {
                type: "text_delta",
                delta: text.slice(i, i + chunkSize),
              };
            }
          }
        }
      }
    }

    // Emit results
    yield {
      type: "results",
      items: parsed.media_list,
    };

    // Save to conversation history
    finalResponse.output.forEach((output) => fullConversation.push(output));

    // Signal completion
    yield { type: "done" };

    // Save conversation for debugging in development only
    if (process.env.NODE_ENV === "development") {
      try {
        const { writeFileSync } = await import("fs");
        const logFile = `/tmp/ai-conversation-streaming-${Date.now()}.json`;
        writeFileSync(logFile, JSON.stringify(fullConversation, null, 2));
        console.log(`Debug conversation saved to ${logFile}`);
      } catch (debugError) {
        console.error("Failed to save debug conversation:", debugError);
      }
    }
  } catch (error) {
    console.error("Streaming agent error:", error);

    // Determine error type and emit appropriate error event
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    let errorCode: string | undefined;

    // Check for rate limit errors (429)
    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
    }

    yield {
      type: "error",
      message: errorMessage,
      code: errorCode,
    };
  }
}
