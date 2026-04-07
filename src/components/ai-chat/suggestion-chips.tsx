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
}

export function SuggestionChips({
  suggestions,
  groupLabel,
  onSelect,
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
    },
    borderRadius: border.radius_round,
    backgroundColor: {
      default: "transparent",
      ":hover": color.controlActive,
    },
    color: {
      default: color.textMuted,
      ":hover": color.textOnActive,
    },
    fontFamily: font.family,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._1,
    paddingInline: space._3,
    cursor: "pointer",
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
});
