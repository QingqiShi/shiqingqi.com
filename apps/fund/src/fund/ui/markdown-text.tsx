"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Divider } from "@tuja/ui/components/divider";
import { ExternalLinkIndicator } from "@tuja/ui/components/external-link-indicator";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles = stylex.create({
  root: {
    minInlineSize: 0,
    overflowWrap: "anywhere",
  },
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
    textDecoration: "underline",
    color: color.primaryText,
  },
  list: {
    paddingInlineStart: space._4,
    marginBlock: 0,
  },
  ul: {
    listStyleType: "disc",
  },
  ol: {
    listStyleType: "decimal",
  },
  li: {
    marginBlock: rhythm.inline,
  },
  blockquote: {
    borderInlineStartWidth: border.size_2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.border,
    paddingInlineStart: space._3,
    marginInline: 0,
    marginBlock: 0,
    color: color.mutedForeground,
  },
  pre: {
    backgroundColor: color.muted,
    padding: space._2,
    marginBlock: 0,
    overflowX: "auto",
    overscrollBehaviorX: "contain",
  },
  code: {
    fontFamily: font.familyMono,
  },
  codeInline: {
    backgroundColor: color.muted,
    paddingInline: space._00,
  },
  tableWrapper: {
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    marginBlock: 0,
  },
  table: {
    borderCollapse: "collapse",
    minInlineSize: "100%",
  },
  th: {
    textAlign: "start",
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
    verticalAlign: "top",
  },
});

function MemoLink({
  node: _node,
  children,
  ...props
}: ComponentProps<"a"> & { node?: unknown }) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      css={[a11y.focusRing, styles.a]}
      {...props}
    >
      {children}
      <ExternalLinkIndicator
        label={t({ en: "(opens in new tab)", zh: "（在新标签页中打开）" })}
      />
    </a>
  );
}

// An agent writes a memo for people, and its headings sit inside a page that
// has its own h1 and h2, so each memo heading takes one rank lower.
const components: Components = {
  h1: ({ node: _node, ...props }) => (
    <h3 css={[typeRole.h3, styles.heading]} {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h4 css={[typeRole.h4, styles.heading]} {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h5 css={[typeRole.h4, styles.heading]} {...props} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h6 css={[typeRole.label, styles.heading]} {...props} />
  ),
  p: ({ node: _node, ...props }) => <p css={styles.p} {...props} />,
  a: MemoLink,
  ul: ({ node: _node, ...props }) => (
    <ul css={[styles.list, styles.ul]} {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol css={[styles.list, styles.ol]} {...props} />
  ),
  li: ({ node: _node, ...props }) => <li css={styles.li} {...props} />,
  hr: () => <Divider />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote css={styles.blockquote} {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre css={[corner.radius_2, styles.pre]} {...props} />
  ),
  code: ({ node: _node, className, style: _style, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");
    return (
      <code
        {...props}
        css={[
          typeRole.bodySmall,
          styles.code,
          !isBlock && corner.radius_1,
          !isBlock && styles.codeInline,
        ]}
      />
    );
  },
  table: ({ node: _node, ...props }) => (
    <div css={styles.tableWrapper}>
      <table
        css={[typeRole.bodySmall, typeModifier.numeric, styles.table]}
        {...props}
      />
    </div>
  ),
  th: ({ node: _node, ...props }) => <th css={styles.th} {...props} />,
  td: ({ node: _node, ...props }) => <td css={styles.td} {...props} />,
};

const remarkPlugins = [remarkGfm];

/** Markdown that an agent wrote for people, such as a meeting memo or a rationale. */
export function MarkdownText({ children }: { children: string }) {
  return (
    <div css={[stack.item, typeModifier.verbatim, styles.root]}>
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
