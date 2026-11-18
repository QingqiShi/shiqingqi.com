import * as stylex from "@stylexjs/stylex";
import { Anchor } from "@tuja/ui/components/anchor";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { Fragment, type ReactNode } from "react";
import { useNewTabLabel } from "#src/reader/use-new-tab-label.ts";
import { linkParts } from "./link-parts.ts";

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

/** A run of text, with each allowed web address as a link. */
function withLinks(
  text: string,
  links: ReadonlySet<string>,
  newTabLabel: string,
): ReactNode[] {
  return linkParts(text, links).map((part, index) =>
    part.kind === "text" ? (
      part.text
    ) : (
      <Anchor
        key={index}
        href={part.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        newTabLabel={newTabLabel}
      >
        {part.text}
      </Anchor>
    ),
  );
}

/** Text with `**bold**` runs as `strong`, and allowed links as links; everything else stays as it is. */
function inlineOf(
  text: string,
  links: ReadonlySet<string>,
  newTabLabel: string,
): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => {
    const content = withLinks(part, links, newTabLabel);
    return index % 2 === 1 ? (
      <strong key={index}>{content}</strong>
    ) : (
      <Fragment key={index}>{content}</Fragment>
    );
  });
}

const NO_LINKS: ReadonlySet<string> = new Set();

/**
 * The assistant's text, as React text nodes only: paragraphs, lists, bold
 * runs and headings as bold lines. A web address becomes a link only when it
 * is in `links`, the server's research lists; other links and images stay as
 * plain text.
 */
export function AssistantText({
  text,
  links = NO_LINKS,
}: {
  text: string;
  links?: ReadonlySet<string>;
}) {
  const newTabLabel = useNewTabLabel();
  const inline = (part: string) => inlineOf(part, links, newTabLabel);
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
