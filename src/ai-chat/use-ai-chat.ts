"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { z } from "zod";
import { isUIMessage } from "#src/ai-chat/is-ui-message.ts";
import { accumulateToolOutputs } from "#src/components/ai-chat/map-tool-output.ts";
import {
  getCachedPreferencesContext,
  loadPreferencesContext,
} from "#src/preference-store/preference-store.ts";
import type { SupportedLocale } from "#src/types.ts";

export interface ChatMessageMetadata {
  inputTokens?: number;
  sessionId?: string;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

const messageMetadataSchema = z.object({
  inputTokens: z.number().optional(),
  sessionId: z.string().optional(),
});

function findSessionIdFromMessages(
  messages: ChatUIMessage[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const metadata = messages[i].metadata;
    if (metadata?.sessionId) {
      return metadata.sessionId;
    }
  }
  return undefined;
}

const STORAGE_KEY_PREFIX = "ai-chat-session:";

function getStoredSessionId(locale: SupportedLocale): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${locale}`);
  } catch {
    return null;
  }
}

function setStoredSessionId(locale: SupportedLocale, sessionId: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${locale}`, sessionId);
  } catch {
    // May throw in SSR or when storage quota is exceeded
  }
}

function clearStoredSessionId(locale: SupportedLocale) {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${locale}`);
  } catch {
    // Intentionally ignored — localStorage may be unavailable
  }
}

const sessionResponseSchema = z.object({
  messages: z.array(z.custom<ChatUIMessage>(isUIMessage)),
  sessionId: z.string(),
});

async function fetchSession(
  sessionId: string,
): Promise<{ messages: ChatUIMessage[]; sessionId: string } | null> {
  const response = await fetch("/api/ai-chat/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (response.ok) {
    return sessionResponseSchema.parse(await response.json());
  }
  if (response.status === 404) {
    return null;
  }
  throw new Error(`Failed to fetch session: ${response.status}`);
}

type ContinueSessionStatus = "idle" | "pending" | "error";

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(
    null,
  );
  const [continueSessionStatus, setContinueSessionStatus] =
    useState<ContinueSessionStatus>("idle");

  const chatResult = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport<ChatUIMessage>({
      api: "/api/ai-chat",
      prepareSendMessagesRequest: ({ messages, trigger }) => {
        const sessionId = findSessionIdFromMessages(messages);
        if (trigger === "regenerate-message") {
          return { body: { sessionId, locale, trigger } };
        }
        const lastMessage = messages[messages.length - 1];

        if (!sessionId && lastMessage) {
          const prefsCtx = getCachedPreferencesContext();
          if (prefsCtx) {
            const enrichedMessage = {
              ...lastMessage,
              parts: [
                { type: "text" as const, text: prefsCtx },
                ...lastMessage.parts,
              ],
            };
            return {
              body: { sessionId, message: enrichedMessage, locale, trigger },
            };
          }
        }

        return { body: { sessionId, message: lastMessage, locale, trigger } };
      },
    }),
    messageMetadataSchema,
    onFinish: ({ messages }) => {
      const sessionId = findSessionIdFromMessages(messages);
      if (sessionId) {
        setStoredSessionId(locale, sessionId);
      }
    },
  });

  // Warm the preferences cache from IndexedDB on mount so it's available
  // for the transport to inject into the first message of a new session.
  useEffect(() => {
    loadPreferencesContext().catch(() => {});
  }, []);

  // Deferred to useEffect so the initial render matches the server (null),
  // avoiding a hydration mismatch — localStorage is not available during SSR.
  useEffect(() => {
    const stored = getStoredSessionId(locale);
    if (stored) {
      setPreviousSessionId(stored);
    }
  }, [locale]);

  // Dismiss banner when user starts a new conversation
  if (previousSessionId && chatResult.messages.length > 0) {
    setPreviousSessionId(null);
  }

  const continueSession = () => {
    if (!previousSessionId) return;
    // De-dupe rapid clicks — the previous in-flight fetch will resolve the
    // banner one way or another.
    if (continueSessionStatus === "pending") return;
    setContinueSessionStatus("pending");
    fetchSession(previousSessionId)
      .then((result) => {
        if (!result) {
          // 404: session gone server-side. Forget it and start fresh.
          clearStoredSessionId(locale);
          setPreviousSessionId(null);
          setContinueSessionStatus("idle");
          return;
        }
        chatResult.setMessages(result.messages);
        setPreviousSessionId(null);
        setContinueSessionStatus("idle");
      })
      .catch((error) => {
        // Network / 5xx: surface to the user instead of silently freezing
        // the banner. The user can retry or dismiss.
        console.error("Failed to restore session", error);
        setContinueSessionStatus("error");
      });
  };

  const dismissPreviousSession = () => {
    clearStoredSessionId(locale);
    setPreviousSessionId(null);
    setContinueSessionStatus("idle");
  };

  return {
    ...chatResult,
    toolOutputs: accumulateToolOutputs(chatResult.messages),
    previousSessionId,
    continueSession,
    continueSessionStatus,
    dismissPreviousSession,
  };
}
