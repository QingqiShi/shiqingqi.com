import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

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
  labelVariant?: "words" | "code";
  /**
   * Section framing. `"card"` (default) wraps the section in a raised surface —
   * the treatment shared across the design-system doc pages. `"plain"` drops the
   * card chrome so the section reads from its heading and surrounding spacing
   * alone, letting inner surfaces carry the emphasis instead. The colour page
   * pilots `"plain"`; other pages keep the card default untouched.
   */
  frame?: "card" | "plain";
  children: ReactNode;
}

export function Showcase({
  label,
  labelVariant = "words",
  frame = "card",
  children,
}: ShowcaseProps) {
  const plain = frame === "plain";
  return (
    <section
      css={[
        styles.showcase,
        plain ? styles.plainFrame : [cardSurface.base, styles.card],
      ]}
    >
      {label ? (
        <h2
          css={[
            plain ? styles.headingPlain : styles.label,
            labelVariant === "code" && styles.labelCode,
          ]}
        >
          {label}
        </h2>
      ) : null}
      <div css={styles.body}>{children}</div>
    </section>
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
    <Text variant="bodySmall" tone="muted">
      {label}{" "}
      <span
        css={[corner.radius_1, styles.stateValue, tabular && styles.tabular]}
      >
        {children}
      </span>
    </Text>
  );
}

const styles = stylex.create({
  showcase: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  // Default doc-page framing: the shared card surface (cardSurface.base) plus
  // the doc-page padding.
  card: {
    padding: space._5,
  },
  // Plain framing: no card chrome. The section is delineated by its heading and
  // the generous gap the doc-page body puts between siblings, so the page canvas
  // stays the ground and inner surfaces do the highlighting.
  plainFrame: {
    gap: space._4,
  },
  label: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    fontWeight: font.weight_6,
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
    margin: 0,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    backgroundColor: color.bgInteractiveRest,
  },
  tabular: {
    fontVariantNumeric: "tabular-nums",
  },
});
