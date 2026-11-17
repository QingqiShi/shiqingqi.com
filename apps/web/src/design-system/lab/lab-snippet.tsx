"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { CodeBlock } from "@tuja/ui/components/code-block";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { LabSnippet as LabSnippetModel } from "./build-lab-snippet.ts";

interface LabSnippetProps {
  snippet: LabSnippetModel;
}

/**
 * The code for what is on the Canvas, on the same raised card a documentation
 * page's usage sample takes. `CodeBlock` draws the parts and plays a change
 * like a code-walkthrough slide; this card only adds the eyebrow and the
 * Copy button around it.
 *
 * The card is a flow block with a surface: when a change gives the code more
 * or fewer lines, the card moves to its new place and its lower edge moves
 * with the code.
 */
export function LabSnippet({ snippet }: LabSnippetProps) {
  return (
    <FlowBlock surface css={[corner.radius_2, styles.card]}>
      <div css={[row.item, styles.head]}>
        <Text as="span" look="caption" tone="muted" css={typeRole.overline}>
          {t({ en: "Usage", zh: "用法" })}
        </Text>
        <Button
          size="sm"
          look="ghost"
          icon={<CopyIcon weight="bold" />}
          aria-label={t({ en: "Copy code", zh: "复制代码" })}
          onClick={() => {
            void navigator.clipboard.writeText(snippet.text);
          }}
        />
      </div>
      <CodeBlock
        parts={snippet.parts}
        label={t({ en: "Code", zh: "代码" })}
        css={styles.code}
        contentCss={styles.codeInset}
      />
    </FlowBlock>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlockStart: `calc(${space._2} - ${border.size_1})`,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.popover,
    minInlineSize: 0,
    inlineSize: "100%",
    minBlockSize: 0,
    maxBlockSize: "100%",
  },
  head: {
    justifyContent: "space-between",
    paddingInline: `calc(${space._3} - ${border.size_1})`,
  },
  // The block takes the room that the card has left, and the code scrolls in
  // it on both axes.
  code: {
    gridTemplateRows: "minmax(0, 1fr)",
    minBlockSize: 0,
    borderStartStartRadius: 0,
    borderStartEndRadius: 0,
    borderEndStartRadius: `calc(${border.radius_2} - ${border.size_1})`,
    borderEndEndRadius: `calc(${border.radius_2} - ${border.size_1})`,
    cornerShape: "squircle",
  },
  codeInset: {
    overflowY: "auto",
    paddingInline: `calc(${space._3} - ${border.size_1})`,
    paddingBlockEnd: `calc(${space._2} + ${space._1} - ${border.size_1})`,
  },
});
