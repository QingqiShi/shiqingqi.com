"use client";

import * as stylex from "@stylexjs/stylex";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { ExternalLinkIndicator } from "../shared/external-link-indicator";

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
  hr: {
    width: "100%",
    borderStyle: "none",
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.controlTrack,
    marginBlock: 0,
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
    overscrollBehaviorX: "contain",
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
  tableWrapper: {
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    marginBlock: 0,
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: font.uiBodySmall,
  },
  th: {
    textAlign: "left",
    fontWeight: font.weight_6,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderBottomWidth: border.size_2,
    borderBottomStyle: "solid",
    borderBottomColor: color.controlTrack,
    whiteSpace: "nowrap",
  },
  td: {
    paddingBlock: space._1,
    paddingInline: space._2,
    borderBottomWidth: border.size_1,
    borderBottomStyle: "solid",
    borderBottomColor: color.controlTrack,
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
  a: ({ node, children, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" css={styles.a} {...props}>
      {children}
      <ExternalLinkIndicator />
    </a>
  ),
  ul: ({ node, ...props }) => <ul css={styles.ul} {...props} />,
  ol: ({ node, ...props }) => <ol css={styles.ol} {...props} />,
  li: ({ node, ...props }) => <li css={styles.li} {...props} />,
  hr: ({ node, ...props }) => <hr css={styles.hr} {...props} />,
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
  table: ({ node, ...props }) => (
    <div css={styles.tableWrapper}>
      <table css={styles.table} {...props} />
    </div>
  ),
  th: ({ node, ...props }) => <th css={styles.th} {...props} />,
  td: ({ node, ...props }) => <td css={styles.td} {...props} />,
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
