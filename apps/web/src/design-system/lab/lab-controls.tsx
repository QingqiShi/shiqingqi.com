"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { glassSurface } from "@tuja/ui/components/glass-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import {
  type EffectSticky,
  useEffectSticky,
} from "@tuja/ui/hooks/use-effect-sticky";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar, scrollY } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Identifier } from "#src/design-system/identifier.tsx";
import { LabControl } from "./lab-control.tsx";
import type { LabAction, LabState } from "./lab-reducer.ts";
import { LabVariantSection } from "./lab-variant-section.tsx";
import type { LabControlModel, LabVariantChoice } from "./types.ts";

interface LabControlsProps {
  variants: readonly LabVariantChoice[];
  controls: readonly LabControlModel[];
  state: LabState;
  /** Runs the change, and moves the Canvas to its new layout. */
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
  const sticky = useEffectSticky();
  return (
    <EffectCarrier value={sticky}>
      <PanelScroller sticky={sticky}>
        <LabVariantSection
          variants={variants}
          variantId={state.variantId}
          onSelect={(variantId) => {
            dispatch({ type: "selectVariant", variantId });
          }}
        />

        <section css={stack.tight}>
          <Text as="span" look="caption" tone="muted" css={typeRole.overline}>
            {t({ en: "Props", zh: "Props" })}
          </Text>
          <div css={stack.item}>
            {controls.map((control) => (
              <div
                key={control.name}
                css={[
                  styles.row,
                  control.kind === "boolean" && styles.rowInline,
                ]}
              >
                {/* The control carries the prop name as its accessible name, so
                  the visible copy is hidden from assistive technology and the
                  name is announced once. */}
                <span aria-hidden css={styles.propName}>
                  <Text as="span" look="caption" tone="muted">
                    <Identifier>{control.name}</Identifier>
                  </Text>
                </span>
                <LabControl
                  control={control}
                  props={state.props}
                  onChange={(value) => {
                    dispatch({
                      type: "setProp",
                      prop: control.name,
                      value,
                    });
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
      </PanelScroller>
    </EffectCarrier>
  );
}

/**
 * The panel is the sticky box, and the scroller is a box inside it: the Glass
 * rim is an absolute box, and in a scroller it stops at the scrollbar and
 * scrolls away with the content. The Scroll region must know the sticky
 * carrier as its parent, so it is a component inside that carrier.
 */
function PanelScroller({
  sticky,
  children,
}: {
  sticky: EffectSticky;
  children: ReactNode;
}) {
  const { ref, css } = sticky;
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div css={styles.cell}>
      <div
        ref={ref}
        css={[corner.radius_3, glassSurface.base, styles.panel, css]}
      >
        <div
          ref={scroller}
          css={[
            scrollY.base,
            scrollbar.autoHide,
            transition.scrollbarColor,
            styles.scroller,
          ]}
        >
          <div ref={content} css={styles.content}>
            <EffectCarrier value={region}>{children}</EffectCarrier>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The panel's column in the Canvas. Size containment keeps the height of
  // the controls out of the height of the Canvas, so a long list of props
  // does not make the page scroll.
  cell: {
    // Below `md` the bar at the foot of the viewport carries the controls
    // instead, so the Specimen keeps the whole screen.
    display: { default: "none", [breakpoints.md]: "block" },
    containerType: "size",
  },
  panel: {
    // Sticky, so the controls stay in view when a tall Specimen makes the
    // page scroll. It also positions the Glass rim.
    position: "sticky",
    insetBlockStart: space._4,
    // The panel stops at the foot of the Canvas, or of the viewport when the
    // Canvas is taller, and scrolls inside instead.
    maxBlockSize: `min(100cqb, calc(100dvh - ${space._7}))`,
    display: "flex",
    flexDirection: "column",
  },
  // The scroller clips to the corners of the panel.
  scroller: {
    minBlockSize: 0,
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.group,
    padding: space._5,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
  propName: {
    fontFamily: font.familyMono,
  },
});
