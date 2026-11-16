import * as stylex from "@stylexjs/stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

/** An icon beside text. The icon takes its size from the type role. */
export function Glyph({
  size = "body",
  css,
  children,
}: {
  size?: "body" | "bodySmall";
  css?: StyleProp;
  children: ReactNode;
}) {
  return (
    <span css={[typeRole[size], styles.glyph, css]} aria-hidden>
      {children}
    </span>
  );
}

const styles = stylex.create({
  glyph: { display: "inline-flex", flexShrink: 0 },
});
