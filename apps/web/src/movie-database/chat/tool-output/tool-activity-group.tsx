"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { TERMINAL_STATES, ToolActivityLine } from "./tool-activity-line";

interface ToolPartData {
  toolCallId: string;
  toolName: string;
  state: string;
  input: unknown;
  output?: unknown;
}

interface ToolActivityGroupProps {
  toolParts: ReadonlyArray<ToolPartData>;
  isStreaming?: boolean;
}

export function ToolActivityGroup({
  toolParts,
  isStreaming = false,
}: ToolActivityGroupProps) {
  if (toolParts.length === 0) return null;

  const allComplete =
    !isStreaming && toolParts.every((p) => TERMINAL_STATES.has(p.state));

  if (!allComplete) {
    return (
      <div css={styles.container}>
        {toolParts.map((part) => (
          <ToolActivityLine
            key={part.toolCallId}
            toolName={part.toolName}
            state={part.state}
            input={part.input}
            output={part.output}
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
      <Disclosure
        look="inline"
        summary={
          <Text as="span" look="bodySmall" tone="muted">
            {summaryText}
          </Text>
        }
      >
        <div css={styles.expandedContent}>
          {toolParts.map((part) => (
            <ToolActivityLine
              key={part.toolCallId}
              toolName={part.toolName}
              state={part.state}
              input={part.input}
              output={part.output}
            />
          ))}
        </div>
      </Disclosure>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingBlock: space._1,
  },
  expandedContent: {
    paddingLeft: space._4,
    paddingTop: space._1,
  },
});
