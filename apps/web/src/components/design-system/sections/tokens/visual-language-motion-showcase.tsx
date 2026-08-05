"use client";

import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Overlay } from "@tuja/ui/components/overlay";
import { Text } from "@tuja/ui/components/text";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { Identifier } from "../../identifier.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

// How far the dot travels — long enough for the overshoot past this point to
// read clearly before the spring settles back onto it.
const SPRING_TRAVEL = 108;

export function VisualLanguageMotionShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Progressive blur", zh: "渐进虚化" })}>
        <ShowcaseHelper>
          {t({
            en: "A floating element blurs the page around it instead of darkening it — strongest nearest the element, easing back to sharp further out. The blur belongs to the page; the element itself keeps a crisp edge. Open the panel and watch what happens behind it.",
            zh: "浮层元素让周围的页面虚化，而不是把页面调暗——离它越近虚化越强，越远则逐渐恢复清晰。虚化属于页面本身，浮层元素则保持清晰的边缘。打开面板，看看它背后发生了什么。",
          })}
        </ShowcaseHelper>
        <Specimen caption={t({ en: "open the panel", zh: "打开面板" })}>
          <ProgressiveBlurDemo />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Motion", zh: "动效" })}>
        <ShowcaseHelper>
          {t({
            en: "Motion springs: it overshoots, then settles. All three share the same character and differ only in how far they carry past the target. Press a control to compare them — nothing here loops.",
            zh: "动效以弹簧的方式运动：先越过目标，再回落稳定。三条曲线性格相同，差别只在越过目标的幅度。按下控件即可比较——这里没有循环动画。",
          })}
        </ShowcaseHelper>
        <div css={styles.springStack}>
          <SpringRow
            name="easing.springQuiet"
            meta="~4% · 300ms"
            variantStyle={styles.dotQuiet}
          />
          <SpringRow
            name="easing.spring"
            meta="~9% · 400ms"
            variantStyle={styles.dotRegular}
          />
          <SpringRow
            name="easing.springLively"
            meta="~20% · 500ms"
            variantStyle={styles.dotLively}
          />
        </div>
      </Showcase>
    </>
  );
}

/** The consumer owns `isOpen`, so a specimen has to own it too. */
function ProgressiveBlurDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {t({ en: "Open panel", zh: "打开面板" })}
      </Button>
      <Overlay
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        aria-label={t({ en: "Progressive blur example", zh: "渐进虚化示例" })}
      >
        <div css={styles.overlayBody}>
          <Heading level={2}>
            {t({ en: "Progressive blur", zh: "渐进虚化" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "The page behind this panel is blurred rather than dimmed — strongest close to the edge, sharp again further out. Press Escape or click outside to close.",
              zh: "面板背后的页面被虚化而非调暗——越靠近边缘虚化越强，再远一些便恢复清晰。按 Escape 或点击外部即可关闭。",
            })}
          </Text>
        </div>
      </Overlay>
    </>
  );
}

interface SpringRowProps {
  /** The easing token this row plays, rendered for copying. */
  name: string;
  /** Overshoot percentage and duration, already formatted. */
  meta: string;
  variantStyle: StyleXStyles;
}

/** One spring, played on demand so its overshoot is comparable against its siblings. */
function SpringRow({ name, meta, variantStyle }: SpringRowProps) {
  const [moved, setMoved] = useState(false);

  return (
    <div css={styles.springRow}>
      <div css={styles.springMeta}>
        <span css={styles.springName}>
          <Identifier>{name}</Identifier>
        </span>
        <span css={styles.springOvershoot}>{meta}</span>
      </div>
      <div css={styles.springTrack}>
        <span
          css={[
            styles.dot,
            variantStyle,
            moved ? styles.dotAt1 : styles.dotAt0,
          ]}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setMoved((value) => !value);
        }}
      >
        {t({ en: "Play", zh: "播放" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  overlayBody: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    padding: space._8,
    maxInlineSize: "60ch",
  },
  springStack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  springRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._3,
  },
  springMeta: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    inlineSize: "10rem",
    flexShrink: 0,
  },
  springName: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMain,
  },
  springOvershoot: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  springTrack: {
    position: "relative",
    inlineSize: `${(SPRING_TRAVEL + 28).toString()}px`,
    blockSize: space._6,
    flexShrink: 0,
  },
  dot: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: space._6,
    blockSize: space._6,
    borderRadius: border.radius_round,
    backgroundColor: color.accent,
    transitionProperty: "transform",
  },
  dotQuiet: {
    transitionDuration: {
      default: duration._300,
      [motionConstants.REDUCED_MOTION]: "0s",
    },
    transitionTimingFunction: easing.springQuiet,
  },
  dotRegular: {
    transitionDuration: {
      default: duration._400,
      [motionConstants.REDUCED_MOTION]: "0s",
    },
    transitionTimingFunction: easing.spring,
  },
  dotLively: {
    transitionDuration: {
      default: duration._500,
      [motionConstants.REDUCED_MOTION]: "0s",
    },
    transitionTimingFunction: easing.springLively,
  },
  dotAt0: { transform: "translateX(0)" },
  dotAt1: { transform: `translateX(${SPRING_TRAVEL.toString()}px)` },
});
