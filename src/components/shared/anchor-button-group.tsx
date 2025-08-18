import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { border, color, controlSize } from "@/tokens.stylex";
import { buttonTokens } from "./button.stylex";
import { GlassSurface } from "./glass-surface";

interface AnchorButtonGroupProps {
  bright?: boolean;
}

export function AnchorButtonGroup({
  bright,
  children,
}: PropsWithChildren<AnchorButtonGroupProps>) {
  return (
    <GlassSurface radius="1" css={[styles.container, bright && styles.bright]}>
      <div css={styles.padding}>{children}</div>
    </GlassSurface>
  );
}

const styles = stylex.create({
  container: {
    display: "inline-flex",
    gap: controlSize._1,
    borderRadius: border.radius_2,
    justifyContent: "center",
    position: "relative",
    [buttonTokens.height]: controlSize._8,
  },
  bright: {
    backgroundColor: color.controlThumb,
  },
  padding: {
    padding: controlSize._0,
  },
});
