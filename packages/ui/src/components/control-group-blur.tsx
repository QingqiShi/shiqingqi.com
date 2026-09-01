"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { flex } from "../primitives/flex.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { space } from "../tokens.stylex.ts";
import { ProgressiveBlur } from "./progressive-blur.tsx";

// How far the page blurs past a group, and how strongly against it. A small
// radius, because a group is a handful of controls rather than a panel — but a
// long run-out relative to a control that is 40px tall, so the page reads as
// losing focus around the controls rather than wearing a ring.
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
 * radius every such group shares — so a header group and a sticky filter bar
 * blur the page the same way rather than each picking a number. The controls
 * sit in a row the same 4px apart, whichever group they belong to.
 *
 * The blur is painted on the page's Blur plane whenever there is one, under
 * every control on the page, so one group's blur never lands on another
 * group's controls.
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
