import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface AnnotatedRegionProps {
  /** Localized name for this part of the screen, e.g. "Hero". */
  label: string;
  /**
   * The `@tuja/ui` entry points this region composes, already joined for
   * display. Component names are identifiers rather than copy, so they are the
   * one string on this page that is deliberately not translated.
   */
  composes: string;
  /** Drawn only while the page's annotation switch is on. */
  annotated: boolean;
  children: ReactNode;
}

/**
 * One labelled region of the composed screen, and the whole mechanism behind the
 * page's annotation switch.
 *
 * Off, it is a bare wrapper: the screen has to be able to read as a product
 * screen, and an exemplar permanently covered in documentation chrome is a
 * diagram of a screen rather than the thing itself. On, the region gets a dashed
 * boundary and a caption naming what it is built from, so the same pixels answer
 * "which components is this?" without a second copy of the screen to compare
 * against.
 *
 * Two deliberate choices about how the annotation is drawn:
 *
 * - `outline`, not `border`. An outline is painted outside the box without
 *   joining the layout, so toggling the switch cannot move anything inside the
 *   region by a pixel — which is the only way the reader can trust that the
 *   annotated screen and the plain screen are the same screen.
 * - The caption sits in flow beneath the region rather than floating over its
 *   corner. A pinned label has to dodge whatever content is under it, and at
 *   390px there is no corner left to dodge into; in flow it wraps, it never
 *   covers the thing it describes, and it stays selectable text.
 */
export function AnnotatedRegion({
  label,
  composes,
  annotated,
  children,
}: AnnotatedRegionProps) {
  return (
    <div
      css={[
        styles.region,
        annotated ? corner.radius_2 : null,
        annotated ? styles.outlined : null,
      ]}
    >
      {children}
      {annotated ? (
        <p css={styles.caption}>
          <Text as="span" variant="overline" tone="accent" weight="bold">
            {label}
          </Text>
          <Text as="span" variant="caption" tone="subtle" css={styles.composes}>
            {composes}
          </Text>
        </p>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  region: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  outlined: {
    outlineWidth: border.size_1,
    outlineStyle: "dashed",
    outlineColor: color.accentBorder,
    outlineOffset: space._1,
  },
  caption: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space._1,
    margin: 0,
  },
  // Monospace, because the caption lists import names rather than prose: it is
  // the same signal the props tables and usage snippets use for identifiers.
  composes: {
    fontFamily: font.familyMono,
  },
});
