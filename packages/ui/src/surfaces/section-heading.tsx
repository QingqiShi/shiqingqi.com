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
  labelledBy,
  children,
}: {
  level: SectionLevel;
  look: SectionLook;
  labelledBy?: string | undefined;
  children: ReactNode;
}) {
  const Tag = headingTags[level];
  return (
    <Tag {...stylex.props(lookStyles[look])} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}

const headingTags = {
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const satisfies Record<SectionLevel, string>;

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
