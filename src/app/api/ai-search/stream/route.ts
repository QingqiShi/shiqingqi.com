import type { NextRequest } from "next/server";
import "server-only";
import type { ClientMessage, StreamingEvent } from "@/ai/streaming-agent";
import { streamingAgent } from "@/ai/streaming-agent";
import { ALLOWED_REFERER } from "@/constants";
import type { SupportedLocale } from "@/types";

// System instructions for the AI agent
const SYSTEM_INSTRUCTIONS = `You are a helpful movie and TV show search assistant.
ALWAYS try to fetch results using the available tools based on the user's request, even with limited information.
Use reasonable defaults: if no year specified, search recent releases; if no genre specified, use the closest match.
For queries like "popular action movies", immediately call discover_movies with genre=action and sort_by=popularity.
For specific titles, use search_movies_by_title or search_tv_shows_by_title.
After calling tools and getting results, call complete_phase_1 to generate your final response.
Be conversational but PROACTIVE - fetch data first, explain later.`;

// Validate referer to prevent unauthorized access
function validateReferer(request: NextRequest): boolean {
  const referer = request.headers.get("Referer") ?? "";
  if (!referer) return false;

  try {
    const refererUrl = new URL(referer);
    return ALLOWED_REFERER.some((allowedReferer) =>
      refererUrl.origin.endsWith(allowedReferer),
    );
  } catch {
    return false;
  }
}

// Validate message format and constraints
function validateMessages(messages: unknown): messages is ClientMessage[] {
  if (!Array.isArray(messages)) {
    return false;
  }

  if (messages.length === 0 || messages.length > 20) {
    return false;
  }

  return messages.every((msg) => {
    if (typeof msg !== "object" || msg === null) return false;

    const message = msg as Record<string, unknown>;

    // Validate role
    if (message.role !== "user" && message.role !== "assistant") {
      return false;
    }

    // Validate content
    if (typeof message.content !== "string") {
      return false;
    }

    // Validate content length (max 1000 characters)
    if (message.content.length > 1000) {
      return false;
    }

    // Validate optional results field
    if (
      message.results !== undefined &&
      (!Array.isArray(message.results) || message.results.length === 0)
    ) {
      return false;
    }

    return true;
  });
}

// Sanitize message content to prevent XSS
function sanitizeMessage(message: ClientMessage): ClientMessage {
  return {
    ...message,
    content: message.content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;"),
  };
}

// Format event as Server-Sent Event
function formatSSE(event: StreamingEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  // Validate referer
  if (!validateReferer(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Parse request body
    const body = (await request.json()) as {
      messages: unknown;
      locale?: string;
    };

    // Validate messages
    if (!validateMessages(body.messages)) {
      return Response.json(
        {
          error:
            "Invalid messages format. Must be array of 1-20 messages with role and content (max 1000 chars each).",
        },
        { status: 400 },
      );
    }

    // Validate locale
    const locale: SupportedLocale = body.locale === "zh" ? "zh" : "en";

    // Sanitize all messages
    const sanitizedMessages = body.messages.map(sanitizeMessage);

    // Create abort controller for timeout and client disconnection
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Stream timeout after 90 seconds");
      abortController.abort();
    }, 90000); // 90 second timeout

    // Create ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeClose = () => {
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        };

        try {
          // Start streaming agent
          const eventStream = streamingAgent(
            sanitizedMessages,
            SYSTEM_INSTRUCTIONS,
            locale,
          );

          // Process events from streaming agent
          for await (const event of eventStream) {
            // Check if client disconnected or timeout occurred
            if (abortController.signal.aborted) {
              console.log("Stream aborted (client disconnect or timeout)");
              safeClose();
              return;
            }

            // Format and send event
            const sseData = formatSSE(event);
            controller.enqueue(new TextEncoder().encode(sseData));

            // If error or done, stop streaming
            if (event.type === "error" || event.type === "done") {
              break;
            }
          }

          // Close stream
          safeClose();
        } catch (error) {
          console.error("Streaming error:", error);

          // Send error event
          const errorMessage =
            error instanceof Error ? error.message : "Unknown streaming error";

          let errorCode: string | undefined;

          // Check for rate limit errors
          if (
            errorMessage.includes("429") ||
            errorMessage.includes("rate limit")
          ) {
            errorCode = "RATE_LIMIT_EXCEEDED";
          }

          const errorEvent: StreamingEvent = {
            type: "error",
            message: errorMessage,
            code: errorCode,
          };

          try {
            controller.enqueue(new TextEncoder().encode(formatSSE(errorEvent)));
          } catch {
            // Controller might be closed already
          }

          safeClose();
        } finally {
          // Clear timeout
          clearTimeout(timeoutId);
        }
      },

      cancel() {
        // Client disconnected
        console.log("Client disconnected from stream");
        abortController.abort();
        clearTimeout(timeoutId);
      },
    });

    // Return stream with SSE headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Stream route error:", error);

    // Return JSON error for non-streaming errors
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
