import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionIdSchema } from "#src/ai-chat/session-schema.ts";
import { getSessionMessages } from "#src/session-store/session-store.ts";

const bodySchema = z.object({ sessionId: sessionIdSchema });

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Missing or invalid sessionId" },
        { status: 400 },
      );
    }

    const messages = await getSessionMessages(parsed.data.sessionId);
    if (!messages) {
      return Response.json({ error: "session-not-found" }, { status: 404 });
    }

    return Response.json({ messages, sessionId: parsed.data.sessionId });
  } catch (error) {
    console.error("AI Chat session POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
