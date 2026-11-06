"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
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
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
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
  /** Animates the Canvas for every change except a live step. */
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
                <span aria-hidden css={[typeRole.caption, styles.propName]}>
                  <Identifier>{control.name}</Identifier>
                </span>
                <LabControl
                  control={control}
                  props={state.props}
                  onChange={(value, isLive) => {
                    dispatch({
                      type: "setProp",
                      prop: control.name,
                      value,
                      isLive,
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
 * The panel is the sticky box and its own scroller. The Scroll region must
 * know the sticky carrier as its parent, so it is a component inside that
 * carrier.
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
    <div
      ref={mergeRefs(ref, scroller)}
      css={[
        corner.radius_3,
        glassSurface.base,
        scrollY.base,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.panel,
        css,
      ]}
    >
      <div ref={content} css={styles.content}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

const styles = stylex.create({
  panel: {
    // Below `md` the bar at the foot of the viewport carries the controls
    // instead, so the Specimen keeps the whole screen.
    display: { default: "none", [breakpoints.md]: "block" },
    // Sticky below the header, so the controls stay in view while the Canvas
    // runs on. It also positions the Glass rim.
    position: "sticky",
    insetBlockStart: space._4,
    alignSelf: "start",
    // A panel taller than the viewport would pin its foot out of reach, so it
    // stops at the viewport and scrolls inside instead.
    maxBlockSize: { [breakpoints.md]: `calc(100dvh - ${space._7})` },
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
    color: color.fgMuted,
  },
});
