import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { typeRole } from "../primitives/type.stylex.ts";
import { color } from "../tokens.stylex.ts";
import type { SectionLevel } from "./section.tsx";

/**
 * Renders the label with its own styles instead of composing `Heading` with
 * an override, since two `stylex.props` calls would each emit a `font-size`
 * and `color` class — leaving stylesheet order, not composition order, to
 * decide which wins.
 *
 * @internal
 */
export function SectionHeading({
  level,
  children,
}: {
  level: SectionLevel;
  children: ReactNode;
}) {
  switch (level) {
    case 2:
      return <h2 css={[typeRole.label, styles.title]}>{children}</h2>;
    case 3:
      return <h3 css={[typeRole.label, styles.title]}>{children}</h3>;
    case 4:
      return <h4 css={[typeRole.label, styles.title]}>{children}</h4>;
    case 5:
      return <h5 css={[typeRole.label, styles.title]}>{children}</h5>;
    case 6:
      return <h6 css={[typeRole.label, styles.title]}>{children}</h6>;
  }
}

const styles = stylex.create({
  title: {
    margin: 0,
    color: color.fgMuted,
  },
});
