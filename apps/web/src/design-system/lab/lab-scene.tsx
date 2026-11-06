"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
import { Text } from "@tuja/ui/components/text";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, ratio, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { blurStage } from "#src/design-system/blur-stage.stylex.ts";
import {
  DeviceFrame,
  type DeviceFrameSize,
} from "#src/design-system/sections/components/device-frame.tsx";
import type { LabSceneKind } from "./types.ts";

interface LabSceneProps {
  kind: LabSceneKind;
  children: ReactNode;
}

const FRAME_BLOCK_SIZE = "26rem";

/**
 * The box a Specimen needs around it to show what it does: a scroller, a page
 * to float over, or a screen for a shell. The snippet leaves it out, because a
 * reader's page gives the same.
 */
export function LabScene({ kind, children }: LabSceneProps) {
  switch (kind) {
    case "scroll":
      return <ScrollScene>{children}</ScrollScene>;
    case "backdrop":
      return <BackdropScene>{children}</BackdropScene>;
    case "frame":
      return <FrameScene>{children}</FrameScene>;
    case "page":
      return (
        <FrameScene>
          <div css={styles.pageViewport}>{children}</div>
        </FrameScene>
      );
  }
}

/**
 * A short page in a box that scrolls: a title, the Specimen, then rows to
 * scroll under it, so a sticky box has a page to hold over.
 */
function ScrollScene({ children }: { children: ReactNode }) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={scroller}
      css={[
        corner.radius_3,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
      ]}
    >
      <div ref={content} css={[stack.item, styles.scrollContent]}>
        <EffectCarrier value={region}>
          <Text look="bodySmall" weight="semibold">
            Watchlist
          </Text>
          {children}
          {FILLER_ROWS.map((row) => (
            <div key={row.title} css={[corner.radius_2, styles.row]}>
              <div css={[corner.radius_1, styles.poster]} />
              <div css={stack.text}>
                <Text look="bodySmall" weight="semibold">
                  {row.title}
                </Text>
                <Text look="caption" tone="muted">
                  {row.year}
                </Text>
              </div>
            </div>
          ))}
        </EffectCarrier>
      </div>
    </div>
  );
}

/**
 * A page of text for the Specimen to float over and blur. The transform holds
 * a blur in a fixed box, and the clip keeps it in the scene.
 */
function BackdropScene({ children }: { children: ReactNode }) {
  return (
    <div css={[blurStage.base, styles.backdropClip]}>
      <div css={[corner.radius_3, styles.backdrop]}>
        <div css={[stack.item, styles.backdropText]}>
          {FILLER_TEXT.map((line) => (
            <Text key={line} look="bodySmall" tone="muted">
              {line}
            </Text>
          ))}
        </div>
        <EffectCarrier value="contained">{children}</EffectCarrier>
      </div>
    </div>
  );
}

function FrameScene({ children }: { children: ReactNode }) {
  const sizes: DeviceFrameSize<"wide" | "phone">[] = [
    {
      value: "wide",
      label: t({ en: "Wide", zh: "宽" }),
      inlineSize: "100%",
      blockSize: FRAME_BLOCK_SIZE,
    },
    {
      value: "phone",
      label: t({ en: "Phone", zh: "手机" }),
      inlineSize: "24.375rem",
      blockSize: FRAME_BLOCK_SIZE,
    },
  ];
  return (
    <div css={styles.frame}>
      <DeviceFrame
        label={t({ en: "Width of the frame", zh: "框的宽度" })}
        sizes={sizes}
      >
        {children}
      </DeviceFrame>
    </div>
  );
}

const FILLER_ROWS = [
  { title: "Blade Runner 2049", year: "2017" },
  { title: "Arrival", year: "2016" },
  { title: "Dune", year: "2021" },
  { title: "Sicario", year: "2015" },
  { title: "Prisoners", year: "2013" },
  { title: "Enemy", year: "2013" },
  { title: "Incendies", year: "2010" },
];

const FILLER_TEXT = [
  "This draft has three edits that are not in the shared copy yet.",
  "Anyone who opens the shared copy still sees the version from Tuesday.",
  "Autosave runs every five minutes while the editor stays open.",
  "Comments stay with the paragraph they were left on, also after an edit.",
  "The history keeps each version for thirty days.",
];

const styles = stylex.create({
  // The scene stands in for a page under a header strip, so a sticky row
  // parks a step below its top edge.
  scroller: {
    [headerControlsTokens.clearance]: space._3,
    inlineSize: "28rem",
    maxInlineSize: "100%",
    blockSize: space._14,
    overflowY: "auto",
    overscrollBehavior: "contain",
    // The blur of a stuck row is in a fixed box, which the overflow does not
    // clip. A clip path clips it. A round arc at 0.6 of the radius cuts the
    // same corner as the squircle of the scroller.
    clipPath: "inset(0 round calc(1rem * .6))",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgCanvas,
  },
  scrollContent: {
    position: "relative",
    padding: space._3,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  poster: {
    flexShrink: 0,
    inlineSize: space._8,
    aspectRatio: ratio.poster,
    backgroundColor: color.bgSurfaceSunken,
  },
  backdropClip: {
    inlineSize: "34rem",
    maxInlineSize: "100%",
  },
  // No clip here: the blur fills this box and takes its corners.
  backdrop: {
    position: "relative",
    display: "flex",
    minBlockSize: "22rem",
    padding: space._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  backdropText: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  frame: {
    inlineSize: "100%",
  },
  // The frame does not scroll, so a shell that the page scrolls takes this
  // box as its page.
  pageViewport: {
    blockSize: "100%",
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
});
