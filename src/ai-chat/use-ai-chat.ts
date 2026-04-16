"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { isUIMessage } from "#src/ai-chat/is-ui-message.ts";
import {
  accumulateToolOutputs,
  toolOutputsFingerprint,
} from "#src/components/ai-chat/map-tool-output.ts";
import {
  getCachedPreferencesContext,
  getPreferencesContextReady,
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
  throw new Error(`Failed to fetch session: ${String(response.status)}`);
}

// localStorage doesn't fire storage events for same-tab changes and we only
// need the value at mount time, so subscribe is a no-op. Module-level constant
// ensures referential stability for useSyncExternalStore.
const noopSubscribe = () => () => {};

type ContinueSessionStatus = "idle" | "pending" | "error";

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  // Read the stored session ID from localStorage via useSyncExternalStore.
  // This avoids the hydration mismatch (getServerSnapshot returns null for SSR)
  // without needing a useEffect + setState workaround.
  const storedSessionId = useSyncExternalStore(
    noopSubscribe,
    () => getStoredSessionId(locale),
    () => null,
  );

  // Track whether the banner has been dismissed (user started chatting,
  // continued, or explicitly dismissed). Resets when locale changes so a
  // stored session for the new locale can surface.
  const [dismissed, setDismissed] = useState(false);
  const [dismissedForLocale, setDismissedForLocale] = useState(locale);
  if (dismissedForLocale !== locale) {
    setDismissedForLocale(locale);
    setDismissed(false);
  }

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

        if (!sessionId && messages.length > 0) {
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
  // Uses the shared ready-promise so the sendMessage wrapper below reuses
  // this in-flight load instead of kicking off a duplicate IDB read.
  useEffect(() => {
    getPreferencesContextReady().catch(() => {});
  }, []);

  // Wrap sendMessage so the first send always waits for the preferences
  // cache to be populated. Without this, a user who hits Enter before the
  // mount-time IDB load resolves would silently lose saved preferences for
  // the entire session — the transport only injects preferences on the
  // first message, so a missed first send can never be recovered.
  async function sendMessage(
    ...args: Parameters<typeof chatResult.sendMessage>
  ) {
    await getPreferencesContextReady().catch(() => null);
    return chatResult.sendMessage(...args);
  }

  // Derive previousSessionId: show the stored session only when the user
  // hasn't dismissed the banner and hasn't started a new conversation.
  const previousSessionId =
    dismissed || chatResult.messages.length > 0 ? null : storedSessionId;

  const continueSession = () => {
    if (!storedSessionId) return;
    // De-dupe rapid clicks — the previous in-flight fetch will resolve the
    // banner one way or another.
    if (continueSessionStatus === "pending") return;
    setContinueSessionStatus("pending");
    fetchSession(storedSessionId)
      .then((result) => {
        if (!result) {
          // 404: session gone server-side. Forget it and start fresh.
          clearStoredSessionId(locale);
          setDismissed(true);
          setContinueSessionStatus("idle");
          return;
        }
        chatResult.setMessages(result.messages);
        setDismissed(true);
        setContinueSessionStatus("idle");
      })
      .catch((error: unknown) => {
        // Network / 5xx: surface to the user instead of silently freezing
        // the banner. The user can retry or dismiss.
        console.error("Failed to restore session", error);
        setContinueSessionStatus("error");
      });
  };

  const dismissPreviousSession = () => {
    clearStoredSessionId(locale);
    setDismissed(true);
    setContinueSessionStatus("idle");
  };

  // `chatResult.messages` changes reference on every streaming chunk, but the
  // set of resolved tool outputs only changes when a tool call completes. Cache
  // the derived maps keyed on a fingerprint of tool call IDs, using React's
  // "store info from previous renders" pattern, so downstream components
  // receive stable map references during text streaming. React Compiler cannot
  // memoize this automatically — `messages` is a new array every chunk, so it
  // has no referential equality signal to cache on.
  const fingerprint = toolOutputsFingerprint(chatResult.messages);
  const [cachedToolOutputs, setCachedToolOutputs] = useState(() => ({
    fingerprint,
    maps: accumulateToolOutputs(chatResult.messages),
  }));
  if (cachedToolOutputs.fingerprint !== fingerprint) {
    setCachedToolOutputs({
      fingerprint,
      maps: accumulateToolOutputs(chatResult.messages),
    });
  }

  return {
    ...chatResult,
    sendMessage,
    toolOutputs: cachedToolOutputs.maps,
    previousSessionId,
    continueSession,
    continueSessionStatus,
    dismissPreviousSession,
  };
}
