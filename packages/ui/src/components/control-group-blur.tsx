"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { flex } from "../primitives/flex.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { space } from "../tokens.stylex.ts";
import { ProgressiveBlur } from "./progressive-blur.tsx";

// Small radius, since a group is a handful of controls, not a panel; a long
// reach keeps the page reading as losing focus, not wearing a ring.
const CONTROL_BLUR_REACH_PX = 64;
const CONTROL_BLUR_RADIUS_PX = 8;

interface ControlGroupBlurProps {
  /** Whether the page is blurred around the group yet. */
  isShown: boolean;
  /** The controls in the group. */
  children: ReactNode;
  /** StyleX styles merged over the group's own — layout and placement. */
  css?: StyleProp;
}

/**
 * The page blurred around one group of floating controls, at the reach and
 * radius every such group shares, so a header group and a sticky filter bar
 * blur the page the same way.
 *
 * Painted on the page's Blur plane whenever there is one, under every
 * control, so one group's blur never lands on another's controls.
 *
 * @internal
 */
export function ControlGroupBlur({
  isShown,
  children,
  css,
}: ControlGroupBlurProps) {
  return (
    <ProgressiveBlur
      reach={CONTROL_BLUR_REACH_PX}
      radius={CONTROL_BLUR_RADIUS_PX}
      isShown={isShown}
      css={[flex.row, styles.group, css]}
    >
      {children}
    </ProgressiveBlur>
  );
}

const styles = stylex.create({
  group: {
    gap: space._1,
  },
});
