"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { animate, motionTokens } from "@tuja/ui/primitives/motion.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";
import { HeldLoop } from "./held-loop.tsx";

export function MotionKeyframePresets() {
  // Bumping the key remounts the one-shot presets, so they play again.
  const [tick, setTick] = useState(0);

  return (
    <Showcase label={t({ en: "Keyframe presets", zh: "关键帧预设" })}>
      <div css={[flex.wrap, styles.replayBar]}>
        <ShowcaseHelper>
          {t({
            en: "The one-shot presets play on mount. The two loops run while the pointer is over them.",
            zh: "一次性预设在挂载时播放。两个循环在指针悬停其上时运行。",
          })}
        </ShowcaseHelper>
        <Button
          look="outline"
          size="sm"
          icon={<ArrowClockwiseIcon weight="bold" />}
          onClick={() => {
            setTick((value) => value + 1);
          }}
        >
          {t({ en: "Replay", zh: "重播" })}
        </Button>
      </div>
      <SpecimenGrid>
        <Specimen caption="animate.fadeIn">
          <div
            key={`fadeIn-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <span css={[corner.radius_2, styles.animSubject, animate.fadeIn]} />
          </div>
        </Specimen>
        <Specimen caption="animate.fadeOut">
          <div
            key={`fadeOut-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <span
              css={[
                corner.radius_2,
                styles.animSubject,
                animate.fadeOut,
                styles.holdEnd,
              ]}
            />
          </div>
        </Specimen>
        <Specimen caption="animate.slideUp">
          <div
            key={`slideUp-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <div css={[corner.radius_2, styles.slideViewport]}>
              <span
                css={[corner.radius_2, styles.animSubject, animate.slideUp]}
              />
            </div>
          </div>
        </Specimen>
        <Specimen caption="animate.slideDown">
          <div
            key={`slideDown-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <div css={[corner.radius_2, styles.slideViewport]}>
              <span
                css={[corner.radius_2, styles.animSubject, animate.slideDown]}
              />
            </div>
          </div>
        </Specimen>
        <Specimen caption="animate.expand">
          <div
            key={`expand-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <div css={animate.expand}>
              <span
                css={[styles.expandInner, corner.radius_2, styles.animSubject]}
              />
            </div>
          </div>
        </Specimen>
        <Specimen caption="animate.collapse">
          <div
            key={`collapse-${tick.toString()}`}
            css={[corner.radius_2, styles.animTile]}
          >
            <div css={animate.collapse}>
              <span
                css={[styles.expandInner, corner.radius_2, styles.animSubject]}
              />
            </div>
          </div>
        </Specimen>
        <Specimen caption="animate.pulse">
          <HeldLoop>
            <div css={[corner.radius_2, styles.animTile]}>
              <span
                css={[
                  corner.radius_2,
                  styles.animSubject,
                  animate.pulse,
                  styles.heldPlayState,
                ]}
              />
            </div>
          </HeldLoop>
        </Specimen>
        <Specimen caption="animate.bounce">
          <HeldLoop>
            <div css={[corner.radius_2, styles.animTile]}>
              <div css={[row.tight, styles.dots]}>
                <span
                  css={[
                    corner.radius_round,
                    styles.dot,
                    animate.bounce,
                    styles.heldPlayState,
                  ]}
                />
                <span
                  css={[
                    corner.radius_round,
                    styles.dot,
                    animate.bounce,
                    styles.heldPlayState,
                    styles.dotDelay1,
                  ]}
                />
                <span
                  css={[
                    corner.radius_round,
                    styles.dot,
                    animate.bounce,
                    styles.heldPlayState,
                    styles.dotDelay2,
                  ]}
                />
              </div>
            </div>
          </HeldLoop>
        </Specimen>
      </SpecimenGrid>
    </Showcase>
  );
}

const styles = stylex.create({
  replayBar: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
  animTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    minBlockSize: "96px",
    paddingBlock: space._3,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  animSubject: {
    inlineSize: space._7,
    blockSize: space._7,
    backgroundColor: color.bgAccent,
  },
  holdEnd: {
    animationFillMode: "forwards",
  },
  slideViewport: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._7,
    blockSize: space._7,
    overflow: "hidden",
  },
  expandInner: {
    inlineSize: space._7,
    minBlockSize: 0,
    overflow: "hidden",
  },
  heldPlayState: {
    animationPlayState: motionTokens.playState,
  },
  dots: {
    blockSize: space._7,
  },
  dot: {
    inlineSize: space._2,
    blockSize: space._2,
    backgroundColor: color.bgAccent,
  },
  dotDelay1: {
    animationDelay: "0.16s",
  },
  dotDelay2: {
    animationDelay: "0.32s",
  },
});
