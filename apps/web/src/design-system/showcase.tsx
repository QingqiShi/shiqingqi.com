import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocSection } from "./doc-section.tsx";
import { onReadingColumn } from "./reading-column.stylex.ts";

interface ShowcaseProps {
  label?: string;
  /**
   * How the label is set. `"words"` (default) is the uppercase eyebrow, which
   * only works on ordinary words: it flattens the camel humps a code identifier
   * relies on, so `useControlled` arrives as `USECONTROLLED`. `"code"` is for a
   * label that names a real export — a hook, a primitive, a token — and keeps
   * its casing, setting it in the mono face so it still reads as an eyebrow
   * rather than as a heading.
   */
  labelLook?: "words" | "code";
  /**
   * Section framing. `"card"` (default) wraps the section in a raised surface —
   * the treatment shared across the design-system doc pages. `"plain"` drops the
   * card chrome so the section reads from its heading and surrounding spacing
   * alone, letting inner surfaces carry the emphasis instead. The colour page
   * pilots `"plain"`; other pages keep the card default untouched.
   */
  frame?: "card" | "plain";
  /**
   * Set when the specimen needs more room than the reading column: the
   * section spans the Shell's content width instead, overhanging the reading
   * column by the same amount on each side. The label and the helper stay on
   * the reading column. Below the width where the two coincide, this changes
   * nothing.
   */
  breakout?: boolean;
  children: ReactNode;
}

export function Showcase({
  label,
  labelLook = "words",
  frame = "card",
  breakout = false,
  children,
}: ShowcaseProps) {
  const plain = frame === "plain";
  return (
    <DocSection
      title={label}
      titleCss={[
        plain
          ? [typeRole.h2, styles.headingPlain]
          : [typeRole.overline, styles.label],
        labelLook === "code" && styles.labelCode,
        breakout && onReadingColumn.base,
      ]}
      css={[
        !plain && [cardSurface.base, styles.card],
        breakout && styles.breakout,
      ]}
    >
      {children}
    </DocSection>
  );
}

interface StateReadoutProps {
  /** What produced the value — `"onChange →"`, `"selected →"`. Already localised. */
  label: string;
  /** Fixed-width figures, so a value that changes on every move holds still. */
  tabular?: boolean;
  children: ReactNode;
}

/**
 * The value a live demo reports back, as a labelled monospace chip. Shared
 * because every page that demonstrates a callback firing has to answer the same
 * question — what did it just fire with — and four of them had grown their own
 * identical copy of the answer.
 */
export function StateReadout({
  label,
  tabular = false,
  children,
}: StateReadoutProps) {
  return (
    <Text look="bodySmall" tone="muted">
      {label}{" "}
      <span
        css={[
          corner.radius_1,
          styles.stateValue,
          tabular && typeModifier.numeric,
        ]}
      >
        {children}
      </span>
    </Text>
  );
}

const styles = stylex.create({
  // Default doc-page framing: the shared card surface (cardSurface.base) plus
  // the doc-page padding.
  card: {
    padding: space._7,
  },
  // The article is the container. 50% is half the reading column; 50cqi is
  // half the article. So the section overhangs the column by the same amount
  // on each side. `boxSizing` is needed: the app sets no global border-box
  // rule.
  breakout: {
    boxSizing: "border-box",
    inlineSize: "100cqi",
    marginInlineStart: "calc(50% - 50cqi)",
  },
  label: {
    color: color.fgMuted,
  },
  // Overlays whichever label style is in play, so a code label keeps that
  // style's size, colour and weight and changes only what the uppercase eyebrow
  // gets wrong for an identifier: the transform that eats its camel humps, and
  // the wide tracking that belongs to small caps rather than to code.
  labelCode: {
    fontFamily: font.familyMono,
    textTransform: "none",
    letterSpacing: font.trackingNormal,
  },
  headingPlain: {
    color: color.fg,
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fg,
    paddingInline: space._1,
    paddingBlock: space._00,
    backgroundColor: color.bgControl,
  },
});
