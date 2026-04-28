"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { ViewTransition } from "react";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import { useAIChatSend } from "#src/ai-chat/use-ai-chat-send.ts";
import { PreferenceManager } from "#src/components/ai-chat/preference-panel.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { SuggestionChips } from "../ai-chat/suggestion-chips";
import { ChatTextarea } from "../shared/chat-textarea";
import { useHeroVisibility } from "./hero-visibility-context";
import { useInlineChat } from "./inline-chat-context";

interface HeroChatInputProps {
  placeholder: string;
  sendLabel: string;
  suggestions: ReadonlyArray<string>;
  suggestionsGroupLabel: string;
}

export function HeroChatInput({
  placeholder,
  sendLabel,
  suggestions,
  suggestionsGroupLabel,
}: HeroChatInputProps) {
  const { send, isLoading } = useAIChatSend();
  const { heroInputRef, isHeroInputVisible } = useHeroVisibility();
  const { previousSessionId, continueSessionStatus } = useAIChatContext();
  const { openChatWithSession } = useInlineChat();

  const hasPreviousSession = previousSessionId != null;
  const continueLabel =
    continueSessionStatus === "error"
      ? t({
          en: "Couldn't restore — try again",
          zh: "无法恢复，请重试",
        })
      : continueSessionStatus === "pending"
        ? t({ en: "Resuming previous chat…", zh: "恢复中…" })
        : t({
            en: "Continue previous conversation",
            zh: "继续上次的对话",
          });

  return (
    <>
      <div
        ref={heroInputRef}
        css={isHeroInputVisible ? styles.visible : styles.hidden}
        aria-hidden={!isHeroInputVisible || undefined}
        inert={!isHeroInputVisible || undefined}
      >
        <ViewTransition
          name="inline-chat-input"
          share="inline-chat-input-morph"
        >
          <div css={styles.inputShell}>
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
        </ViewTransition>
      </div>
      <div css={[flex.between, styles.meta]}>
        {hasPreviousSession ? (
          <button
            type="button"
            onClick={openChatWithSession}
            disabled={continueSessionStatus === "pending"}
            css={[buttonReset.base, flex.inlineCenter, styles.restoreLink]}
            aria-busy={continueSessionStatus === "pending" ? true : undefined}
          >
            <ClockCounterClockwiseIcon size={14} role="presentation" />
            <span css={styles.restoreLabel}>{continueLabel}</span>
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <PreferenceManager />
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
    pointerEvents: "auto",
  },
  hidden: {
    opacity: 0,
    pointerEvents: "none",
  },
  inputShell: {
    display: "block",
  },
  icon: {
    color: color.controlActive,
    fontSize: "1.25em",
  },
  meta: {
    alignItems: "center",
    gap: space._2,
    marginTop: space._1,
  },
  restoreLink: {
    gap: space._1,
    paddingBlock: space._0,
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    color: {
      default: color.textMuted,
      ":hover": color.controlActive,
      ":disabled": color.textMuted,
    },
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
    borderWidth: 0,
    backgroundColor: "transparent",
    cursor: {
      default: "pointer",
      ":disabled": "progress",
    },
    transition: "color 0.15s ease",
  },
  restoreLabel: {
    borderBottomWidth: border.size_1,
    borderBottomStyle: "dashed",
    borderBottomColor: "currentColor",
    paddingBottom: "1px",
  },
  suggestions: {
    marginTop: space._3,
  },
});
