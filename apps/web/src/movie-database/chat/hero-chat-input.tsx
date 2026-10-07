"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { ViewTransition } from "react";
import { t } from "#src/i18n.ts";
import { useHeroVisibility } from "#src/movie-database/browse/hero-visibility-context.ts";
import { PreferenceManager } from "#src/movie-database/taste/preference-panel.tsx";
import { useAIChatContext } from "./ai-chat-provider.tsx";
import { ChatTextarea } from "./chat-textarea.tsx";
import { useInlineChat } from "./inline-chat-context";
import { SuggestionChips } from "./suggestion-chips";
import { useAIChatSend } from "./use-ai-chat-send.ts";

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
              submitDisabled={isLoading}
              // The hero is a full composer, not a toolbar field: a long
              // prompt grows the box instead of scrolling out of view, and
              // Shift+Enter still breaks a line.
              multiline
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
            css={[
              typeRole.label,
              buttonReset.base,
              flex.inlineCenter,
              styles.restoreLink,
            ]}
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
    color: color.fgAccent,
    fontSize: controlSize._5,
  },
  meta: {
    alignItems: "center",
    gap: rhythm.item,
    marginTop: rhythm.tight,
  },
  restoreLink: {
    gap: controlSize._2,
    paddingBlock: space._0,
    paddingInline: space._2,
    color: {
      default: color.fgMuted,
      ":hover": color.fgAccent,
      ":disabled": color.fgMuted,
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
    marginTop: rhythm.item,
  },
});
