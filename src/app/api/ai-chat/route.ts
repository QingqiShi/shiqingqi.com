import type { UIMessage } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { chat } from "#src/ai-chat/chat.ts";
import { sessionChatInputSchema } from "#src/ai-chat/session-schema.ts";
import {
  generateSessionId,
  getSessionMessages,
  saveSessionMessages,
} from "#src/session-store/session-store.ts";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const input = sessionChatInputSchema.parse(body);

    let sessionId: string;
    let messages: UIMessage[];

    if (input.trigger === "submit-message") {
      // Only user messages may be submitted from the client.
      // Accepting other roles (e.g. "assistant") would let a malicious
      // client inject fake responses or tool-call results into the
      // conversation history.
      if (input.message.role !== "user") {
        return Response.json(
          { success: false, error: "Invalid request body" },
          { status: 400 },
        );
      }

      if (input.sessionId) {
        const stored = await getSessionMessages(input.sessionId);
        if (!stored) {
          return Response.json({ error: "session-not-found" }, { status: 404 });
        }
        sessionId = input.sessionId;
        messages = [...stored, input.message];
      } else {
        sessionId = generateSessionId();
        messages = [input.message];
      }
    } else {
      const stored = await getSessionMessages(input.sessionId);
      if (!stored) {
        return Response.json({ error: "session-not-found" }, { status: 404 });
      }
      sessionId = input.sessionId;
      const lastUserIndex = stored.findLastIndex((m) => m.role === "user");
      messages =
        lastUserIndex >= 0 ? stored.slice(0, lastUserIndex + 1) : stored;
    }

    // Pre-stream checkpoint: save user messages while LLM initializes
    const [, result] = await Promise.all([
      saveSessionMessages(sessionId, messages),
      chat({
        messages,
        locale: input.locale,
        countryCode: request.headers.get("x-vercel-ip-country") ?? undefined,
      }),
    ]);

    let finishedMessages: UIMessage[] | undefined;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const innerStream = result.toUIMessageStream({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "finish-step") {
              return { inputTokens: part.usage.inputTokens, sessionId };
            }
            return undefined;
          },
          onFinish: ({ messages: updatedMessages }) => {
            finishedMessages = updatedMessages;
          },
        });

        const reader = innerStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            writer.write(value);
          }
        } catch (error) {
          writer.write({
            type: "error",
            errorText: error instanceof Error ? error.message : "Stream error",
          });
          return;
        }

        if (finishedMessages) {
          try {
            await saveSessionMessages(sessionId, finishedMessages);
          } catch (error) {
            console.error("Failed to save session messages on finish:", error);
            writer.write({
              type: "error",
              errorText: "Failed to save session",
            });
          }
        }
      },
      onError: (error) => {
        console.error("AI Chat stream error:", error);
        return error instanceof Error ? error.message : "Internal server error";
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }
    console.error("AI Chat POST error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
