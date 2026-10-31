"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import {
  animate,
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { MotionDot, MotionStage } from "./motion-stage.tsx";

const STYLES = `import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";

const styles = stylex.create({
  dot: {
    transitionDuration: duration._500,
    transitionTimingFunction: easing.spring,
    transitionProperty: {
      default: "transform, background-color",
      [motionConstants.REDUCED_MOTION]: "background-color",
    },
  },
});`;

/**
 * A dot on the style in the snippet, and a preset loop, both on the branch the
 * reader's own system asks for. Change the setting, and both change in place.
 */
export function ReducedMotionSpecimen() {
  const reduced = useReducedMotion();
  const [isAcross, setIsAcross] = useState(false);

  return (
    <>
      <div css={[stack.group, styles.root]}>
        <ul role="list" css={styles.grid}>
          <MotionStage
            name="styles.dot"
            caption={
              reduced
                ? t({
                    en: "Reduced motion: it arrives without travelling. The fill still fades.",
                    zh: "减弱动效：它不经移动直接到位，填充仍会渐变。",
                  })
                : t({
                    en: "It travels, and the fill fades.",
                    zh: "它一路移过去，填充随之渐变。",
                  })
            }
          >
            <MotionDot isAcross={isAcross} motion={styles.dot} />
          </MotionStage>
          <MotionStage
            name="animate.pulse"
            hasPath={false}
            caption={
              reduced
                ? t({
                    en: "Reduced motion: it holds still.",
                    zh: "减弱动效：它保持静止。",
                  })
                : t({ en: "It pulses.", zh: "它缓缓明暗起伏。" })
            }
          >
            <MotionDot isAcross={false} motion={animate.pulse} />
          </MotionStage>
        </ul>
        <div css={stack.tight}>
          <span>
            <Button
              look="outline"
              onClick={() => {
                setIsAcross((value) => !value);
              }}
            >
              {isAcross
                ? t({ en: "Send it back", zh: "让它移回来" })
                : t({ en: "Send it across", zh: "让它移过去" })}
            </Button>
          </span>
          <p css={[typeRole.bodySmall, styles.hint]}>
            {t({
              en: "Both follow your system setting. Change it, and they change on this page.",
              zh: "两者都跟随你的系统设置。改变设置，它们就在本页随之改变。",
            })}
          </p>
        </div>
      </div>
      <UsageSnippet label={t({ en: "Styles", zh: "样式" })} code={STYLES} />
    </>
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
      "@container (min-width: 36rem)": "repeat(2, minmax(0, 1fr))",
    },
    columnGap: rhythm.group,
    rowGap: rhythm.item,
    inlineSize: "100%",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  dot: {
    transitionDuration: duration._500,
    transitionTimingFunction: easing.spring,
    transitionProperty: {
      default: "transform, background-color",
      [motionConstants.REDUCED_MOTION]: "background-color",
    },
  },
  hint: {
    margin: 0,
    color: color.fgMuted,
  },
});
