import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { border, color, controlSize, shadow } from "../tokens.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

interface AnchorButtonGroupProps {
  /** Renders the group on a bright surface, to sit above elevated content. */
  bright?: boolean;
  /** StyleX styles merged over the container's own — the config-layer escape hatch. */
  css?: StyleProp;
}

export function AnchorButtonGroup({
  bright,
  css,
  children,
}: PropsWithChildren<AnchorButtonGroupProps>) {
  return (
    <div css={[styles.container, bright && styles.bright, css]}>{children}</div>
  );
}

const styles = stylex.create({
  container: {
    display: "inline-flex",
    gap: controlSize._1,
    backgroundColor: color.bgSurface,
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
    backgroundColor: color.bgSurfaceBright,
  },
});
