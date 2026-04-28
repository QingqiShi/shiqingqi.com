"use client";

import * as stylex from "@stylexjs/stylex";
import { use } from "react";
import { flex, justify } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { ChatActionsContext } from "./chat-actions-context";

interface SuggestionChipsProps {
  suggestions: ReadonlyArray<string>;
  groupLabel: string;
  onSelect?: (text: string) => void;
  /**
   * When true, all chips are rendered in a disabled state. Mirrors the
   * ChatTextarea `disabled` behavior so callers can signal "chat is busy —
   * don't queue another send" consistently across both inputs instead of
   * letting clicks silently no-op.
   */
  disabled?: boolean;
}

export function SuggestionChips({
  suggestions,
  groupLabel,
  onSelect,
  disabled,
}: SuggestionChipsProps) {
  const chatActions = use(ChatActionsContext);
  const handleSelect = onSelect ?? chatActions?.sendMessage;

  return (
    <div
      role="group"
      aria-label={groupLabel}
      css={[flex.wrap, justify.center, styles.container]}
    >
      {suggestions.map((text) => (
        <button
          key={text}
          type="button"
          css={styles.chip}
          onClick={() => handleSelect?.(text)}
          disabled={disabled}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const styles = stylex.create({
  container: {
    gap: space._1,
  },
  chip: {
    appearance: "none",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: {
      default: color.controlTrack,
      ":hover": color.controlActive,
      ":disabled": color.controlTrack,
    },
    borderRadius: border.radius_round,
    backgroundColor: {
      default: "transparent",
      ":hover": color.controlActive,
      ":disabled": "transparent",
    },
    color: {
      default: color.textMuted,
      ":hover": color.textOnActive,
      ":disabled": color.textMuted,
    },
    fontFamily: font.family,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._1,
    paddingInline: space._3,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
    },
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
  },
});
