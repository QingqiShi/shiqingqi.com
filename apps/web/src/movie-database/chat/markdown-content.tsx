"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLinkIndicator } from "#src/links/external-link-indicator.tsx";

const styles = stylex.create({
  // The stack puts rhythm.item between blocks. These margins change that to
  // rhythm.group above a heading and to rhythm.tight below it.
  heading: {
    marginBlockStart: {
      default: `calc(${rhythm.group} - ${rhythm.item})`,
      ":first-child": 0,
    },
    marginBlockEnd: `calc(${rhythm.tight} - ${rhythm.item})`,
  },
  p: {
    marginBlock: 0,
  },
  a: {
    color: color.fgAccent,
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
    marginBlock: rhythm.inline,
  },
  hr: {
    width: "100%",
    borderStyle: "none",
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    marginBlock: 0,
  },
  blockquote: {
    borderInlineStartWidth: border.size_2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.borderAccent,
    paddingLeft: space._3,
    marginInline: 0,
    marginBlock: 0,
    color: color.fgMuted,
  },
  pre: {
    backgroundColor: color.bgSurfaceSunken,
    padding: space._2,
    marginBlock: 0,
    overflowX: "auto",
    overscrollBehaviorX: "contain",
  },
  codeBlock: {
    fontFamily: font.familyMono,
  },
  codeInline: {
    fontFamily: font.familyMono,
    backgroundColor: color.bgSurfaceSunken,
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
  },
  th: {
    textAlign: "left",
    fontWeight: font.weight_6,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderBottomWidth: border.size_2,
    borderBottomStyle: "solid",
    borderBottomColor: color.border,
    whiteSpace: "nowrap",
  },
  td: {
    paddingBlock: space._1,
    paddingInline: space._2,
    borderBottomWidth: border.size_1,
    borderBottomStyle: "solid",
    borderBottomColor: color.border,
  },
});

const components: Components = {
  h1: ({ node, ...props }) => (
    <h1 css={[typeRole.h1, styles.heading]} {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 css={[typeRole.h2, styles.heading]} {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 css={[typeRole.h3, styles.heading]} {...props} />
  ),
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
  pre: ({ node, ...props }) => (
    <pre css={[corner.radius_2, styles.pre]} {...props} />
  ),
  code: ({ node, className, style, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return <code {...props} css={[typeRole.bodySmall, styles.codeBlock]} />;
    }
    return (
      <code
        css={[typeRole.bodySmall, corner.radius_1, styles.codeInline]}
        {...props}
      />
    );
  },
  table: ({ node, ...props }) => (
    <div css={styles.tableWrapper}>
      <table css={[typeRole.bodySmall, styles.table]} {...props} />
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
    <div css={stack.item}>
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
