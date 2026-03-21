"use client";

import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { ChatMessageList } from "#src/components/ai-chat/chat-message-list.tsx";

interface ChatMessagesSectionProps {
  emptyState: ReactNode;
  typingIndicatorLabel: string;
  scrollToBottomLabel: string;
}

// TODO(#1662): remove demo data — replace with useAIChat
const demoMessages: ReadonlyArray<UIMessage> = [
  {
    id: "demo-1",
    role: "user",
    parts: [{ type: "text", text: "Can you recommend a good sci-fi movie?" }],
  },
  {
    id: "demo-2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I'd recommend Arrival (2016)! It's a thought-provoking sci-fi film directed by Denis Villeneuve. The story follows a linguist recruited by the military to communicate with extraterrestrial visitors. It beautifully explores themes of language, time, and human connection.\n\nThe cinematography is stunning and Amy Adams delivers an incredible performance. It's the kind of film that stays with you long after watching.",
      },
    ],
  },
  {
    id: "demo-3",
    role: "user",
    parts: [
      { type: "text", text: "What about something more action-oriented?" },
    ],
  },
  {
    id: "demo-4",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        text: "The user wants action sci-fi. Let me think of movies with great action sequences that are also well-regarded critically...",
      },
      {
        type: "text",
        text: "For action sci-fi, check out Edge of Tomorrow (2014) starring Tom Cruise and Emily Blunt! It's a thrilling time-loop movie where a soldier relives the same battle against alien invaders, getting better each time.\n\nThink Groundhog Day meets intense military sci-fi. The action sequences are fantastic and it has a great sense of humor too.",
      },
    ],
  },
];

export function ChatMessagesSection({
  emptyState,
  typingIndicatorLabel,
  scrollToBottomLabel,
}: ChatMessagesSectionProps) {
  return (
    <ChatMessageList
      messages={demoMessages}
      status="submitted"
      emptyState={emptyState}
      typingIndicatorLabel={typingIndicatorLabel}
      scrollToBottomLabel={scrollToBottomLabel}
    />
  );
}
