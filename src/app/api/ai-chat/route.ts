import type { NextRequest } from "next/server";
import { z } from "zod";
import { chat, chatInputSchema } from "#src/ai-chat/chat.ts";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const result = await chat(chatInputSchema.parse(body));
    return Response.json({ success: true, text: result.text });
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
