"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StreamingEvent } from "@/ai/streaming-agent";
import type { MediaListItem } from "@/utils/types";

// Message type for conversation state
export interface ConversationalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  results?: MediaListItem[];
  status: "streaming" | "complete" | "error";
  error?: string;
}

// Hook return type
export interface UseConversationalAISearchReturn {
  messages: ConversationalMessage[];
  sendMessage: (content: string) => void;
  clearConversation: () => void;
  retryLastMessage: () => void;
  isStreaming: boolean;
  error: string | null;
}

// Generate unique ID for messages
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Maximum message length
const MAX_MESSAGE_LENGTH = 1000;

// Maximum conversation length (10 user + 10 assistant = 20 total)
const MAX_MESSAGES = 20;

export function useConversationalAISearch(
  locale: "en" | "zh" = "en",
): UseConversationalAISearchReturn {
  const [messages, setMessages] = useState<ConversationalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Text buffering refs
  const textBufferRef = useRef<string>("");
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AbortController for cancelling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // Last user message content (for retry)
  const lastUserMessageRef = useRef<string>("");

  // Timer for "Still processing..." indicator (5 second delay)
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Retry state (for future use)
  const retryCountRef = useRef<number>(0);

  // Flush text buffer to state
  const flushTextBuffer = useCallback(() => {
    if (textBufferRef.current) {
      const bufferedText = textBufferRef.current;
      textBufferRef.current = "";

      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage?.role === "assistant") {
          lastMessage.content += bufferedText;
        }
        return updated;
      });
    }
  }, []);

  // Handle text delta with 200ms buffering
  const handleTextDelta = useCallback(
    (delta: string) => {
      // Accumulate in buffer
      textBufferRef.current += delta;

      // Clear existing timer
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }

      // Schedule flush in 200ms
      flushTimerRef.current = setTimeout(() => {
        flushTextBuffer();
      }, 200);
    },
    [flushTextBuffer],
  );

  // Handle stream end - flush remaining buffer immediately
  const handleStreamEnd = useCallback(() => {
    // Clear any pending timer
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    // Flush remaining buffer
    flushTextBuffer();
  }, [flushTextBuffer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear timers
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }

      // Abort any active streams
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Send message function
  const sendMessage = useCallback(
    (content: string) => {
      // Validate message length
      if (content.length > MAX_MESSAGE_LENGTH) {
        setError(
          `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
        );
        return;
      }

      // Validate message is not empty
      if (!content.trim()) {
        return;
      }

      // Check conversation limit
      if (messages.length >= MAX_MESSAGES) {
        setError(
          "Conversation limit reached. Please clear the conversation to continue.",
        );
        return;
      }

      // Clear any previous error
      setError(null);

      // Store for retry
      lastUserMessageRef.current = content;

      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear any pending text buffer
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      textBufferRef.current = "";

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Add user message immediately
      const userMessageId = generateId();
      const userMessage: ConversationalMessage = {
        id: userMessageId,
        role: "user",
        content,
        status: "complete",
      };

      // Add placeholder assistant message
      const assistantMessageId = generateId();
      const assistantMessage: ConversationalMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      // Set timer for "Still processing..." indicator (5 seconds)
      processingTimerRef.current = setTimeout(() => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === "assistant" && lastMessage.status === "streaming") {
            lastMessage.thinking = "Still processing...";
          }
          return updated;
        });
      }, 5000);

      // Wrap async logic in IIFE to avoid returning Promise
      void (async () => {
        try {
        // Prepare conversation history for API
        const conversationHistory = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            results: msg.results,
          })),
          { role: "user" as const, content },
        ];

        // Open SSE connection
        const response = await fetch("/api/ai-search/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
            locale,
          }),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error: string };
          throw new Error(errorData.error || "Failed to start stream");
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Process SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

         
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (lines ending with \n\n)
          const lines = buffer.split("\n\n");
          buffer = lines[lines.length - 1] ?? ""; // Keep incomplete line in buffer

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]?.trim();
            if (!line || !line.startsWith("data: ")) {
              continue;
            }

            try {
              const eventData = line.substring(6); // Remove "data: " prefix
              const event = JSON.parse(eventData) as StreamingEvent;

              // Handle event types
              if (event.type === "thinking") {
                // Clear processing timer on first event
                if (processingTimerRef.current) {
                  clearTimeout(processingTimerRef.current);
                  processingTimerRef.current = null;
                }

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage?.role === "assistant") {
                    lastMessage.thinking = event.summary;
                  }
                  return updated;
                });
              } else if (event.type === "text_delta") {
                // Clear processing timer on first event
                if (processingTimerRef.current) {
                  clearTimeout(processingTimerRef.current);
                  processingTimerRef.current = null;
                }


                handleTextDelta(event.delta);
              } else if (event.type === "results") {
                // Flush any pending text first
                handleStreamEnd();

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage?.role === "assistant") {
                    lastMessage.results = event.items;
                  }
                  return updated;
                });
              } else if (event.type === "done") {
                // Flush remaining buffer
                handleStreamEnd();

                // Mark as complete
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage?.role === "assistant") {
                    lastMessage.status = "complete";
                    // Clear thinking indicator on completion
                    lastMessage.thinking = undefined;
                  }
                  return updated;
                });

                setIsStreaming(false);
                break;
              } else if (event.type === "error") {
                // Flush remaining buffer
                handleStreamEnd();

                // Set error state
                const errorMessage = event.message || "An error occurred";
                setError(errorMessage);

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage?.role === "assistant") {
                    lastMessage.status = "error";
                    lastMessage.error = errorMessage;
                  }
                  return updated;
                });

                setIsStreaming(false);
                break;
              }
            } catch (parseError) {
              console.error("Failed to parse SSE event:", parseError);
              // Continue processing other events
            }
          }
        }

        // Stream ended normally
        handleStreamEnd();
        setIsStreaming(false);
      } catch (err) {
        console.error("Stream error:", err);

        // Clear processing timer
        if (processingTimerRef.current) {
          clearTimeout(processingTimerRef.current);
          processingTimerRef.current = null;
        }

        // Check if this was an abort (user cancelled)
        if (err instanceof Error && err.name === "AbortError") {
          // Don't show error for user-initiated cancellation
          setIsStreaming(false);
          return;
        }

        // Handle other errors
        handleStreamEnd();

        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect to AI service";

        setError(errorMessage);

        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === "assistant") {
            lastMessage.status = "error";
            lastMessage.error = errorMessage;
          }
          return updated;
        });

        setIsStreaming(false);
        }
      })();
    },
    [messages, locale, handleTextDelta, handleStreamEnd],
  );

  // Clear conversation
  const clearConversation = useCallback(() => {
    // Abort any active stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear timers and buffers
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    textBufferRef.current = "";

    // Reset state
    setMessages([]);
    setIsStreaming(false);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  // Retry last message
  const retryLastMessage = useCallback(() => {
    if (lastUserMessageRef.current) {
      // Remove last two messages (user + failed assistant)
      setMessages((prev) => prev.slice(0, -2));
      setError(null);

      // Resend
      void sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    sendMessage,
    clearConversation,
    retryLastMessage,
    isStreaming,
    error,
  };
}
