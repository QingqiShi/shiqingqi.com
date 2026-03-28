"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { TERMINAL_STATES, ToolActivityLine } from "./tool-activity-line";

interface ToolPartData {
  toolName: string;
  state: string;
  input: unknown;
}

interface ToolActivityGroupProps {
  toolParts: ReadonlyArray<ToolPartData>;
  isStreaming?: boolean;
}

export function ToolActivityGroup({
  toolParts,
  isStreaming = false,
}: ToolActivityGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (toolParts.length === 0) return null;

  const allComplete =
    !isStreaming && toolParts.every((p) => TERMINAL_STATES.has(p.state));

  if (!allComplete) {
    return (
      <div css={styles.container}>
        {toolParts.map((part, i) => (
          <ToolActivityLine
            key={i}
            toolName={part.toolName}
            state={part.state}
            input={part.input}
          />
        ))}
      </div>
    );
  }

  const count = toolParts.length;
  const toolCallSingular = t({ en: "tool call", zh: "个工具调用" });
  const toolCallPlural = t({ en: "tool calls", zh: "个工具调用" });
  const summaryText =
    count.toString() + " " + (count === 1 ? toolCallSingular : toolCallPlural);

  return (
    <div css={styles.container}>
      <button
        type="button"
        css={[buttonReset.base, flex.row, styles.disclosureButton]}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <CaretRightIcon
          size={14}
          weight="bold"
          css={[styles.caret, isOpen && styles.caretOpen]}
          aria-hidden="true"
        />
        <span>{summaryText}</span>
      </button>
      {isOpen && (
        <div css={styles.expandedContent}>
          {toolParts.map((part, i) => (
            <ToolActivityLine
              key={i}
              toolName={part.toolName}
              state={part.state}
              input={part.input}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingBlock: space._1,
  },
  disclosureButton: {
    gap: space._1,
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: 1.4,
    minHeight: "1.5rem",
  },
  caret: {
    flexShrink: 0,
    transition: "transform 0.15s ease",
  },
  caretOpen: {
    transform: "rotate(90deg)",
  },
  expandedContent: {
    paddingLeft: space._4,
    paddingTop: space._1,
  },
});
