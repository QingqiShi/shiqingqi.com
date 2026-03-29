import type { NextRequest } from "next/server";
import { z } from "zod";
import { chat, chatInputSchema } from "#src/ai-chat/chat.ts";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const input = chatInputSchema.parse(body);
    const result = await chat(input);
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          return { inputTokens: part.usage.inputTokens };
        }
        return undefined;
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
