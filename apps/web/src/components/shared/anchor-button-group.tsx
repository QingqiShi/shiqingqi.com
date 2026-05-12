import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, shadow } from "@tuja/ui/tokens.stylex";
import type { PropsWithChildren } from "react";
import { buttonTokens } from "./button.stylex";

interface AnchorButtonGroupProps {
  bright?: boolean;
}

export function AnchorButtonGroup({
  bright,
  children,
}: PropsWithChildren<AnchorButtonGroupProps>) {
  return (
    <div css={[styles.container, bright && styles.bright]}>{children}</div>
  );
}

const styles = stylex.create({
  container: {
    display: "inline-flex",
    gap: controlSize._1,
    backgroundColor: color.backgroundRaised,
    padding: controlSize._1,
    borderRadius: border.radius_2,
    boxShadow: shadow._2,
    justifyContent: "center",
    position: "relative",
    [buttonTokens.borderRadius]: border.radius_1,
    [buttonTokens.boxShadow]: "none",
    [buttonTokens.height]: controlSize._8,
  },
  bright: {
    backgroundColor: color.controlThumb,
  },
});
