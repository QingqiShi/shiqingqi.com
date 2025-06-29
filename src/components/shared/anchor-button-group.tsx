import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { border, color, controlSize } from "@/tokens.stylex";
import { buttonTokens } from "./button.stylex";
import { glassSurfaceTokens } from "./glass-surface.stylex";

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
    padding: controlSize._1,
    borderRadius: border.radius_2,
    justifyContent: "center",
    position: "relative",
    background: color.backgroundRaised,
    [buttonTokens.borderRadius]: border.radius_1,
    [buttonTokens.height]: controlSize._8,
    [glassSurfaceTokens.borderRadius]: border.radius_1,
  },
  bright: {
    backgroundColor: color.controlThumb,
  },
});
