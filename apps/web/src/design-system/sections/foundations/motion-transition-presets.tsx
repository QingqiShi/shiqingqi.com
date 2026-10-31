"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { MotionDot, MotionStage } from "./motion-stage.tsx";

/** One change of state on three dots. Only the preset differs, so only it decides what animates. */
export function MotionTransitionPresets() {
  const reduced = useReducedMotion();
  const [isAcross, setIsAcross] = useState(false);

  const fadesFill = t({
    en: "The fill fades. The move jumps.",
    zh: "填充渐变，移动直接到位。",
  });

  return (
    <div css={[stack.group, styles.root]}>
      <ul role="list" css={styles.grid}>
        <MotionStage name="transition.colors" caption={fadesFill}>
          <MotionDot isAcross={isAcross} motion={transition.colors} />
        </MotionStage>
        <MotionStage
          name="transition.transform"
          caption={
            reduced
              ? t({
                  en: "Reduced motion: both jump.",
                  zh: "减弱动效：两者都直接到位。",
                })
              : t({
                  en: "The move springs. The fill jumps.",
                  zh: "移动带弹簧，填充直接切换。",
                })
          }
        >
          <MotionDot isAcross={isAcross} motion={transition.transform} />
        </MotionStage>
        <MotionStage
          name="transition.all"
          caption={
            reduced ? fadesFill : t({ en: "Both ease.", zh: "两者都缓动。" })
          }
        >
          <MotionDot isAcross={isAcross} motion={transition.all} />
        </MotionStage>
      </ul>
      <span>
        <Button
          look="outline"
          onClick={() => {
            setIsAcross((value) => !value);
          }}
        >
          {isAcross
            ? t({ en: "Send them back", zh: "让它们移回来" })
            : t({ en: "Send them across", zh: "让它们移过去" })}
        </Button>
      </span>
    </div>
  );
}

const styles = stylex.create({
  root: {
    alignItems: "flex-start",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 36rem)": "repeat(3, minmax(0, 1fr))",
    },
    columnGap: rhythm.group,
    rowGap: rhythm.item,
    inlineSize: "100%",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});
