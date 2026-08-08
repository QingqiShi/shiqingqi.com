import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { border, color, controlSize } from "../tokens.stylex.ts";
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
    // The group sits over other content, so the fill alone does not always find
    // an edge. A hairline does the separating a shadow used to.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
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
