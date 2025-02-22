import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { border, color, controlSize, shadow } from "@/tokens.stylex";
import { buttonTokens } from "./button.stylex";

export function AnchorButtonGroup({ children }: PropsWithChildren) {
  return <div css={styles.container}>{children}</div>;
}

const styles = stylex.create({
  container: {
    display: "inline-flex",
    gap: controlSize._1,
    backgroundColor: color.controlThumb,
    padding: controlSize._1,
    borderRadius: border.radius_2,
    boxShadow: shadow._2,
    justifyContent: "center",
    position: "relative",
    [buttonTokens.borderRadius]: border.radius_1,
    [buttonTokens.boxShadow]: "none",
  },
});
