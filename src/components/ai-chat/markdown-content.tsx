"use client";

import * as stylex from "@stylexjs/stylex";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

const styles = stylex.create({
  h1: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_3,
    marginBlock: 0,
  },
  h2: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    marginBlock: 0,
  },
  h3: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    marginBlock: 0,
  },
  p: {
    marginBlock: 0,
  },
  a: {
    color: color.controlActive,
    textDecoration: "underline",
  },
  ul: {
    paddingLeft: space._4,
    marginBlock: 0,
    listStyleType: "disc",
  },
  ol: {
    paddingLeft: space._4,
    marginBlock: 0,
    listStyleType: "decimal",
  },
  li: {
    marginBlock: space._00,
  },
  blockquote: {
    borderInlineStartWidth: border.size_2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.controlActive,
    paddingLeft: space._3,
    marginInline: 0,
    marginBlock: 0,
    color: color.textMuted,
  },
  pre: {
    backgroundColor: color.backgroundMain,
    borderRadius: border.radius_2,
    padding: space._2,
    marginBlock: 0,
    overflowX: "auto",
  },
  codeBlock: {
    fontFamily: "monospace",
    fontSize: font.uiBodySmall,
  },
  codeInline: {
    fontFamily: "monospace",
    fontSize: font.uiBodySmall,
    backgroundColor: color.backgroundMain,
    borderRadius: border.radius_1,
    paddingInline: space._00,
    paddingBlock: space._00,
  },
  wrapper: {
    gap: space._2,
  },
});

const components: Components = {
  h1: ({ node, ...props }) => <h1 css={styles.h1} {...props} />,
  h2: ({ node, ...props }) => <h2 css={styles.h2} {...props} />,
  h3: ({ node, ...props }) => <h3 css={styles.h3} {...props} />,
  p: ({ node, ...props }) => <p css={styles.p} {...props} />,
  a: ({ node, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" css={styles.a} {...props} />
  ),
  ul: ({ node, ...props }) => <ul css={styles.ul} {...props} />,
  ol: ({ node, ...props }) => <ol css={styles.ol} {...props} />,
  li: ({ node, ...props }) => <li css={styles.li} {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote css={styles.blockquote} {...props} />
  ),
  pre: ({ node, ...props }) => <pre css={styles.pre} {...props} />,
  code: ({ node, className, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return <code css={styles.codeBlock} className={className} {...props} />;
    }
    return <code css={styles.codeInline} {...props} />;
  },
};

const remarkPlugins = [remarkGfm];

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div css={[flex.col, styles.wrapper]}>
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
