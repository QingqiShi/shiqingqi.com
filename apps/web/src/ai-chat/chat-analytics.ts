import type { SupportedLocale } from "#src/types.ts";
import { captureEvent, type AnalyticsEvent } from "#src/utils/posthog.ts";

interface MessageSend {
  /** Messages in the Conversation before this one. */
  messageCount: number;
  locale: SupportedLocale;
}

// A send with no Message before it opens a new Conversation: a restored
// Conversation arrives with its Messages already in place, so it never counts
// as a start. Property names are snake_case to match PostHog's own.
export function messageSendEvents({
  messageCount,
  locale,
}: MessageSend): AnalyticsEvent[] {
  const startedConversation = messageCount === 0;
  const messageSent = {
    name: "message sent",
    properties: {
      locale,
      started_conversation: startedConversation,
      conversation_message_count: messageCount + 1,
    },
  } satisfies AnalyticsEvent;
  return startedConversation
    ? [{ name: "conversation started", properties: { locale } }, messageSent]
    : [messageSent];
}

export function captureMessageSend(send: MessageSend) {
  for (const { name, properties } of messageSendEvents(send)) {
    captureEvent(name, properties);
  }
}
