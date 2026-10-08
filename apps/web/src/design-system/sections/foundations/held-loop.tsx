import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { motionTokens } from "@tuja/ui/primitives/motion.stylex";
import type { ReactNode } from "react";

/**
 * Holds every loop inside it still until the pointer or focus arrives. On a
 * device with no hover the loop runs, because nothing could ever start it.
 */
export function HeldLoop({ children }: { children: ReactNode }) {
  return <div css={styles.held}>{children}</div>;
}

const styles = stylex.create({
  held: {
    [motionTokens.playState]: {
      default: "running",
      [pointer.canHover]: {
        default: "paused",
        ":hover": "running",
        ":focus-within": "running",
      },
    },
  },
});
