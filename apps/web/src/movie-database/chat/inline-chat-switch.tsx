"use client";

import { ViewTransition, type ReactNode } from "react";
import {
  riseIn,
  riseOut,
  softFadeIn,
  softFadeOut,
} from "#src/view-transition-classes.stylex.ts";
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
        <ViewTransition enter={softFadeIn} exit={softFadeOut}>
          {chatBackground}
        </ViewTransition>
      ) : null}
      {isChatActive ? (
        <ViewTransition enter={riseIn} exit={riseOut}>
          {chatContent}
        </ViewTransition>
      ) : (
        browseContent
      )}
    </>
  );
}
