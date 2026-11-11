import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import type { StyleProp } from "../types.ts";
import type { SectionLevel, SectionLook } from "./section.tsx";

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
  look,
  children,
}: {
  level: SectionLevel;
  look: SectionLook;
  children: ReactNode;
}) {
  const css = lookStyles[look];
  switch (level) {
    case 2:
      return <h2 css={css}>{children}</h2>;
    case 3:
      return <h3 css={css}>{children}</h3>;
    case 4:
      return <h4 css={css}>{children}</h4>;
    case 5:
      return <h5 css={css}>{children}</h5>;
    case 6:
      return <h6 css={css}>{children}</h6>;
  }
}

const styles = stylex.create({
  label: {
    margin: 0,
    color: color.mutedForeground,
  },
  heading: {
    margin: 0,
    color: color.foreground,
  },
});

const lookStyles = {
  label: [typeRole.label, styles.label],
  heading: [typeRole.h3, styles.heading],
} satisfies Record<SectionLook, StyleProp>;
