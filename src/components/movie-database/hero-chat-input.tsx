"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { useAIChatSend } from "#src/ai-chat/use-ai-chat-send.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, space } from "#src/tokens.stylex.ts";
import { SuggestionChips } from "../ai-chat/suggestion-chips";
import { ChatTextarea } from "../shared/chat-textarea";
import { useHeroVisibility } from "./hero-visibility-context";

interface HeroChatInputProps {
  placeholder: string;
  sendLabel: string;
  aiModeHref: string;
  suggestions: ReadonlyArray<string>;
  suggestionsGroupLabel: string;
}

export function HeroChatInput({
  placeholder,
  sendLabel,
  aiModeHref,
  suggestions,
  suggestionsGroupLabel,
}: HeroChatInputProps) {
  const { send, isLoading } = useAIChatSend(aiModeHref);
  const { heroInputRef, isHeroInputVisible } = useHeroVisibility();

  return (
    <>
      <div
        ref={heroInputRef}
        css={isHeroInputVisible ? styles.visible : styles.hidden}
      >
        <ChatTextarea
          placeholder={placeholder}
          sendLabel={sendLabel}
          onSubmit={send}
          disabled={isLoading}
          beforeTextarea={
            <span css={[flex.inlineCenter, styles.icon]}>
              <SparkleIcon weight="fill" role="presentation" />
            </span>
          }
        />
      </div>
      <div css={styles.suggestions}>
        <SuggestionChips
          suggestions={suggestions}
          groupLabel={suggestionsGroupLabel}
          onSelect={send}
          disabled={isLoading}
        />
      </div>
    </>
  );
}

const styles = stylex.create({
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  icon: {
    color: color.controlActive,
    fontSize: "1.25em",
  },
  suggestions: {
    marginTop: space._3,
  },
});
