"use client";

import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBackOverride } from "#src/site-shell/back-override-provider.tsx";
import { useAIChatContext } from "./ai-chat-provider.tsx";

/** Marks the box of the chat input in the hero and in the open chat, which is one input that flies between the two. */
export const DATA_INLINE_CHAT_INPUT = "data-inline-chat-input";

type InlineChatSide = "browse" | "chat";

interface InlineChatState {
  isChatActive: boolean;
  /** The side that still shows while it leaves, or `null` when the swap is at rest. */
  leaving: InlineChatSide | null;
  openChat: () => void;
  openChatWithSession: () => void;
  closeChat: () => void;
  /** Takes the side that leaves off the page. */
  finishSwap: () => void;
}

export const InlineChatContext = createContext<InlineChatState | null>(null);

export function InlineChatProvider({ children }: { children: ReactNode }) {
  const [isChatActive, setIsChatActive] = useState(false);
  const [leaving, setLeaving] = useState<InlineChatSide | null>(null);
  const { setMessages, stop, continueSession } = useAIChatContext();
  const { setBackOverride } = useBackOverride();

  // When the chat is off the page, drop any in-flight stream and clear
  // messages so the next open starts fresh. The chat stays on the page while
  // it leaves, so the messages stay until then, and an open before then
  // brings the same chat back. Keyed on the edge rather than
  // living inside `closeChat` so any future code path that closes the chat
  // gets the same cleanup.
  const isChatShown = isChatActive || leaving === "chat";
  const wasShownRef = useRef(isChatShown);
  useEffect(() => {
    const wasShown = wasShownRef.current;
    wasShownRef.current = isChatShown;
    if (wasShown && !isChatShown) {
      void stop();
      setMessages([]);
    }
  }, [isChatShown, setMessages, stop]);

  const swapTo = (isActive: boolean) => {
    if (isActive === isChatActive) return;
    setIsChatActive(isActive);
    setLeaving(isActive ? "browse" : "chat");
  };

  const openChat = () => {
    swapTo(true);
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
    swapTo(false);
  };

  // Register an override on the global Back button while chat is open so the
  // header's Back returns to browse instead of navigating home. Same
  // rationale as `closeChat`: just flip the active flag, don't touch the
  // stored session id.
  const closeFromBack = useEffectEvent(closeChat);
  useEffect(() => {
    if (!isChatActive) return undefined;
    setBackOverride(() => {
      closeFromBack();
    });
    return () => {
      setBackOverride(null);
    };
  }, [isChatActive, setBackOverride]);

  const finishSwap = () => {
    setLeaving(null);
  };

  return (
    <InlineChatContext
      value={{
        isChatActive,
        leaving,
        openChat,
        openChatWithSession,
        closeChat,
        finishSwap,
      }}
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
