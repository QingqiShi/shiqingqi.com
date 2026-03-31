"use client";

import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { z } from "zod";
import { isUIMessage } from "#src/ai-chat/is-ui-message.ts";
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

const chatInstances = new Map<string, Chat<ChatUIMessage>>();

function getOrCreateChat(locale: SupportedLocale): Chat<ChatUIMessage> {
  const existing = chatInstances.get(locale);
  if (existing) return existing;

  const transport = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/ai-chat",
    prepareSendMessagesRequest: ({ messages, trigger }) => {
      const sessionId = findSessionIdFromMessages(messages);
      if (trigger === "regenerate-message") {
        return { body: { sessionId, locale, trigger } };
      }
      const lastMessage = messages[messages.length - 1];
      return { body: { sessionId, message: lastMessage, locale, trigger } };
    },
  });

  const chat = new Chat<ChatUIMessage>({
    transport,
    messageMetadataSchema,
    onFinish: ({ messages }) => {
      const sessionId = findSessionIdFromMessages(messages);
      if (sessionId) {
        setStoredSessionId(locale, sessionId);
      }
    },
    onError: () => {
      const storedSessionId = getStoredSessionId(locale);
      if (!storedSessionId) return;

      const chatInstance = chatInstances.get(locale);
      if (!chatInstance) return;

      fetchSession(storedSessionId)
        .then((result) => {
          const ci = chatInstances.get(locale);
          if (!ci) return;

          if (result) {
            ci.messages = result.messages;
            ci.clearError();
          }
        })
        .catch(console.error);
    },
  });

  chatInstances.set(locale, chat);

  return chat;
}

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  const chat = getOrCreateChat(locale);
  const chatResult = useChat({ chat });

  const [previousSessionId, setPreviousSessionId] = useState<string | null>(
    null,
  );

  // Deferred to useEffect so the initial render matches the server (null),
  // avoiding a hydration mismatch — localStorage is not available during SSR.
  useEffect(() => {
    if (chat.messages.length > 0) return;
    const stored = getStoredSessionId(locale);
    if (stored) {
      setPreviousSessionId(stored);
    }
  }, [chat, locale]);

  // Dismiss banner when user starts a new conversation
  if (previousSessionId && chatResult.messages.length > 0) {
    setPreviousSessionId(null);
  }

  const continueSession = () => {
    if (!previousSessionId) return;
    fetchSession(previousSessionId)
      .then((result) => {
        if (!result) {
          clearStoredSessionId(locale);
          setPreviousSessionId(null);
          return;
        }
        chat.messages = result.messages;
        setPreviousSessionId(null);
      })
      .catch(console.error);
  };

  return {
    ...chatResult,
    previousSessionId,
    continueSession,
  };
}
