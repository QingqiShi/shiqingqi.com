"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { glassSurface } from "@tuja/ui/components/glass-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar, scrollY } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Identifier } from "../identifier.tsx";
import { LabControl } from "./lab-control.tsx";
import { labEyebrow } from "./lab-eyebrow.stylex.ts";
import type { LabAction, LabState } from "./lab-reducer.ts";
import { LabVariantSection } from "./lab-variant-section.tsx";
import type { LabControlModel, LabVariantChoice } from "./types.ts";

interface LabControlsProps {
  variants: readonly LabVariantChoice[];
  controls: readonly LabControlModel[];
  state: LabState;
  /** Already wrapped in a transition, so every change animates the Canvas. */
  dispatch: (action: LabAction) => void;
}

/**
 * The Lab's controls: the Variants, one control per prop, and the way back to
 * the Variant the props came from. A lens of Glass over the Canvas, so the
 * Specimen stays the thing in focus.
 */
export function LabControls({
  variants,
  controls,
  state,
  dispatch,
}: LabControlsProps) {
  return (
    <div
      css={[
        corner.radius_3,
        glassSurface.base,
        scrollY.base,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.panel,
      ]}
    >
      <LabVariantSection
        variants={variants}
        variantId={state.variantId}
        onSelect={(variantId) => {
          dispatch({ type: "selectVariant", variantId });
        }}
      />

      <section css={styles.section}>
        <Text as="span" look="caption" tone="subtle" css={labEyebrow.base}>
          {t({ en: "Props", zh: "属性" })}
        </Text>
        <div css={styles.rows}>
          {controls.map((control) => (
            <div
              key={control.name}
              css={[styles.row, control.kind === "boolean" && styles.rowInline]}
            >
              {/* The control carries the prop name as its accessible name, so
                  the visible copy is hidden from assistive technology and the
                  name is announced once. */}
              <span aria-hidden css={styles.propName}>
                <Identifier>{control.name}</Identifier>
              </span>
              <LabControl
                control={control}
                props={state.props}
                onChange={(value) => {
                  dispatch({ type: "setProp", prop: control.name, value });
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <Button
        look="ghost"
        size="sm"
        onClick={() => {
          dispatch({ type: "reset" });
        }}
      >
        {t({ en: "Reset", zh: "重置" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  panel: {
    // Below `md` the bar at the foot of the viewport carries the controls
    // instead, so the Specimen keeps the whole screen.
    display: { default: "none", [breakpoints.md]: "flex" },
    flexDirection: "column",
    gap: space._4,
    padding: space._3,
    // Sticky below the header, so the controls stay in view while the Canvas
    // runs on. It also positions the Glass rim.
    position: "sticky",
    insetBlockStart: space._4,
    alignSelf: "start",
    // A panel taller than the viewport would pin its foot out of reach, so it
    // stops at the viewport and scrolls inside instead.
    maxBlockSize: { [breakpoints.md]: `calc(100dvh - ${space._7})` },
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space._1,
    minInlineSize: 0,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  propName: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
});
