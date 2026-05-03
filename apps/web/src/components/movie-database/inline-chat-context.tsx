"use client";

import {
  createContext,
  startTransition,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import { useBackOverride } from "#src/contexts/back-override-context.tsx";

interface InlineChatState {
  isChatActive: boolean;
  openChat: () => void;
  openChatWithSession: () => void;
  closeChat: () => void;
}

export const InlineChatContext = createContext<InlineChatState | null>(null);

export function InlineChatProvider({ children }: { children: ReactNode }) {
  const [isChatActive, setIsChatActive] = useState(false);
  const { setMessages, stop, continueSession } = useAIChatContext();
  const { setBackOverride } = useBackOverride();

  // When chat exits, drop any in-flight stream and clear messages so the next
  // open starts fresh. Keyed on the active→inactive edge rather than living
  // inside `closeChat` so any future code path that flips `isChatActive` back
  // to false (e.g. an upstream reset) gets the same cleanup.
  const wasActiveRef = useRef(isChatActive);
  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isChatActive;
    if (wasActive && !isChatActive) {
      void stop();
      setMessages([]);
    }
  }, [isChatActive, setMessages, stop]);

  const openChat = () => {
    if (isChatActive) return;
    startTransition(() => {
      setIsChatActive(true);
    });
  };

  const openChatWithSession = () => {
    continueSession();
    openChat();
  };

  // Closing chat must NOT erase the saved session id. The user might have
  // just streamed a conversation that `useAIChat`'s onFinish persisted to
  // localStorage; they should be able to reopen and continue via the
  // restore banner. Only the banner's explicit Dismiss button should fire
  // `dismissPreviousSession` (which clears the storage key).
  const closeChat = () => {
    if (!isChatActive) return;
    startTransition(() => {
      setIsChatActive(false);
    });
  };

  // Register an override on the global Back button while chat is open so the
  // header's Back returns to browse instead of navigating home. Same
  // rationale as `closeChat`: just flip the active flag, don't touch the
  // stored session id.
  useEffect(() => {
    if (!isChatActive) return undefined;
    setBackOverride(() => {
      startTransition(() => {
        setIsChatActive(false);
      });
    });
    return () => {
      setBackOverride(null);
    };
  }, [isChatActive, setBackOverride]);

  return (
    <InlineChatContext
      value={{ isChatActive, openChat, openChatWithSession, closeChat }}
    >
      {children}
    </InlineChatContext>
  );
}

export function useInlineChat() {
  const context = use(InlineChatContext);
  if (!context) {
    throw new Error("useInlineChat must be used within an InlineChatProvider");
  }
  return context;
}
