"use client";

import { ViewTransition, type ReactNode } from "react";
import { useInlineChat } from "./inline-chat-context";

interface InlineChatSwitchProps {
  browseContent: ReactNode;
  chatContent: ReactNode;
  chatBackground: ReactNode;
}

export function InlineChatSwitch({
  browseContent,
  chatContent,
  chatBackground,
}: InlineChatSwitchProps) {
  const { isChatActive } = useInlineChat();
  return (
    <>
      {isChatActive ? (
        <ViewTransition enter="soft-fade-in" exit="soft-fade-out">
          {chatBackground}
        </ViewTransition>
      ) : null}
      {isChatActive ? (
        <ViewTransition enter="rise-in" exit="rise-out">
          {chatContent}
        </ViewTransition>
      ) : (
        <ViewTransition enter="soft-fade-in" exit="soft-fade-out">
          {browseContent}
        </ViewTransition>
      )}
    </>
  );
}
