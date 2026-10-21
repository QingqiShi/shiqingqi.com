"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import type { ReactNode, RefCallback } from "react";
import { masterDetailTokens } from "./master-detail.stylex.ts";

interface DetailPaneProps {
  /** Names the pane. */
  label: string;
  /** StyleX styles merged over the pane's own. */
  css?: StyleProp;
  children: ReactNode;
}

/**
 * The detail pane beside a list at `lg` and wider: a sticky box that scrolls
 * its own content, so it is a sticky carrier with a Scroll region inside.
 */
export function DetailPane({ label, css, children }: DetailPaneProps) {
  const sticky = useEffectSticky();
  const { ref, css: stickyCss } = sticky;
  return (
    <EffectCarrier value={sticky}>
      <DetailPaneScroller label={label} stickyRef={ref} css={[css, stickyCss]}>
        {children}
      </DetailPaneScroller>
    </EffectCarrier>
  );
}

function DetailPaneScroller({
  label,
  stickyRef,
  css,
  children,
}: {
  label: string;
  stickyRef: RefCallback<Element>;
  css: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <aside
      ref={mergeRefs(stickyRef, scroller)}
      aria-label={label}
      css={[corner.radius_4, styles.pane, css]}
    >
      <div ref={content} css={[flex.col, styles.content]}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </aside>
  );
}

const styles = stylex.create({
  pane: {
    position: "sticky",
    insetBlockStart: space._4,
    maxBlockSize: masterDetailTokens.paneBlockSize,
    overflowY: "auto",
    padding: space._5,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  content: {
    position: "relative",
    minBlockSize: "100%",
  },
});
