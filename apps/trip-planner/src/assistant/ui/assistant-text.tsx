import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const last = blocks.at(-1);
    if (line.trim() === "") {
      blocks.push({ kind: "paragraph", lines: [] });
      continue;
    }
    const marker = BULLET.test(line)
      ? BULLET
      : NUMBERED.test(line)
        ? NUMBERED
        : null;
    if (marker) {
      const ordered = marker === NUMBERED;
      const item = line.replace(marker, "");
      if (last?.kind === "list" && last.ordered === ordered) {
        last.items.push(item);
      } else {
        blocks.push({ kind: "list", ordered, items: [item] });
      }
    } else if (HEADING.test(line)) {
      blocks.push({ kind: "heading", text: line.replace(HEADING, "") });
    } else if (last?.kind === "paragraph") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "paragraph", lines: [line] });
    }
  }
  return blocks.filter(
    (block) => block.kind !== "paragraph" || block.lines.length > 0,
  );
}

/** Text with `**bold**` runs as `strong`; everything else stays as it is. */
function inline(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) =>
      index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
}

/**
 * The assistant's text, as React text nodes only: paragraphs, lists, bold
 * runs and headings as bold lines. Links and images stay as plain text.
 */
export function AssistantText({ text }: { text: string }) {
  return (
    <div css={stack.tight}>
      {blocksOf(text).map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <Text key={index} as="p" weight="semibold" verbatim>
                {inline(block.text)}
              </Text>
            );
          case "list": {
            const items = block.items.map((item, itemIndex) => (
              <Text key={itemIndex} as="li" verbatim>
                {inline(item)}
              </Text>
            ));
            return block.ordered ? (
              <ol key={index} css={[stack.tight, styles.list, styles.ordered]}>
                {items}
              </ol>
            ) : (
              <ul key={index} css={[stack.tight, styles.list, styles.bulleted]}>
                {items}
              </ul>
            );
          }
          case "paragraph":
            return (
              <Text key={index} as="p" verbatim>
                {block.lines.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 ? <br /> : null}
                    {inline(line)}
                  </span>
                ))}
              </Text>
            );
        }
      })}
    </div>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    paddingInlineStart: space._5,
  },
  bulleted: {
    listStyleType: "disc",
  },
  ordered: {
    listStyleType: "decimal",
  },
});
