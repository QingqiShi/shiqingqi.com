"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { CodeBlock } from "@tuja/ui/components/code-block";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { ViewTransition } from "react";
import { t } from "#src/i18n.ts";
import type { LabSnippet as LabSnippetModel } from "./build-lab-snippet.ts";
import { labEyebrow } from "./lab-eyebrow.stylex.ts";

interface LabSnippetProps {
  snippet: LabSnippetModel;
}

/**
 * The code for what is on the Canvas, on the same raised card a documentation
 * page's usage sample takes. `CodeBlock` draws the parts and plays a change
 * like a code-walkthrough slide; this card only adds the eyebrow and the
 * Copy button around it.
 *
 * The card stays live through the page's view transition, so `CodeBlock`'s
 * own boxes can animate on the page's own DOM rather than as view-transition
 * snapshots — a snapshot would escape the card's clip: on a narrow screen the
 * code is wider than the card, and a snapshot would draw over its edge.
 */
export function LabSnippet({ snippet }: LabSnippetProps) {
  return (
    <ViewTransition name="lab-snippet" default="lab-live">
      <div css={[corner.radius_2, styles.card]}>
        <div css={styles.head}>
          <Text as="span" look="caption" tone="subtle" css={labEyebrow.base}>
            {t({ en: "Usage", zh: "用法" })}
          </Text>
          <Button
            size="sm"
            look="ghost"
            icon={<CopyIcon />}
            aria-label={t({ en: "Copy code", zh: "复制代码" })}
            onClick={() => {
              void navigator.clipboard.writeText(snippet.text);
            }}
          />
        </div>
        <CodeBlock parts={snippet.parts} css={styles.scroller} />
      </div>
    </ViewTransition>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
    inlineSize: "100%",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  scroller: {
    paddingBlockEnd: space._1,
  },
});
