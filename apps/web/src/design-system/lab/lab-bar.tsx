"use client";

import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { Text } from "@tuja/ui/components/text";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { useMediaQuery } from "@tuja/ui/hooks/use-media-query";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { font, layer, rhythm, space } from "@tuja/ui/tokens.stylex";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Identifier } from "#src/design-system/identifier.tsx";
import { LabBarMenu } from "./lab-bar-menu.tsx";
import { labBar } from "./lab-bar.stylex.ts";
import { LabControl } from "./lab-control.tsx";
import type { LabAction, LabState } from "./lab-reducer.ts";
import { labWidth } from "./lab-width.stylex.ts";
import type { LabControlModel, LabVariantChoice } from "./types.ts";

const FOCUSABLE = [
  'button:not([tabindex="-1"])',
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

// Derived from the breakpoint token so the JS check cannot drift from the
// style one. `matchMedia` needs the bare condition; the StyleX const carries
// the `@media ` prefix.
const MD_MEDIA_QUERY = breakpoints.md.replace("@media ", "");

interface LabBarProps {
  variants: readonly LabVariantChoice[];
  controls: readonly LabControlModel[];
  state: LabState;
  /** Runs the change, and moves the Canvas to its new layout. */
  dispatch: (action: LabAction) => void;
}

/**
 * The Lab's controls where it is too narrow for the panel beside the stage:
 * a bar of Glass at the foot of the viewport, carrying either the way into its
 * menu or the one control the visitor is tuning. The Specimen keeps the rest
 * of the screen.
 *
 * Below `md` the bar is fixed across the screen. From `md` the sidebar can
 * stand beside the page, so the bar is a sticky footer of the Lab: it is as
 * wide as the Lab, and it moves with the page when the sidebar moves it.
 */
export function LabBar({ variants, controls, state, dispatch }: LabBarProps) {
  // Only the bar pins one control beside the Specimen; the panel shows
  // every control at once, so neither piece of state belongs in the reducer.
  const [activeControlName, setActiveControlName] = useState<string | null>(
    null,
  );
  const [isMenuShown, setIsMenuShown] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const shownControlRef = useRef(activeControlName);
  const isSticky = useMediaQuery(MD_MEDIA_QUERY, false);
  const Frame = isSticky ? StickyFrame : FixedFrame;

  const activeControl = controls.find(
    (control) => control.name === activeControlName,
  );

  useEffect(() => {
    if (shownControlRef.current === activeControlName) return;
    shownControlRef.current = activeControlName;
    const region =
      activeControlName === null ? triggerRef.current : controlRef.current;
    region?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [activeControlName]);

  return (
    <Frame>
      {/* Glass on a layer of its own, not on the bar itself: a
          `backdrop-filter` makes a containing block for fixed children, which
          would trap the menu's backdrop and its Progressive blur inside the
          bar. */}
      <div
        css={[
          corner.radius_3,
          glassSurface.base,
          styles.pane,
          !isSticky && styles.paneFlush,
        ]}
        aria-hidden
      />
      <div
        css={styles.row}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || activeControl === undefined) return;
          event.stopPropagation();
          setActiveControlName(null);
        }}
      >
        {activeControl === undefined ? (
          <>
            <div ref={triggerRef}>
              <MenuButton
                position="sheet"
                popupRole="group"
                open={isMenuShown}
                onOpenChange={setIsMenuShown}
                buttonProps={{
                  type: "button",
                  size: "sm",
                  icon: <SlidersHorizontalIcon weight="bold" />,
                }}
                menuContent={
                  <LabBarMenu
                    variants={variants}
                    controls={controls}
                    variantId={state.variantId}
                    props={state.props}
                    onSelectVariant={(variantId) => {
                      dispatch({ type: "selectVariant", variantId });
                      setActiveControlName(null);
                      setIsMenuShown(false);
                    }}
                    onOpenControl={(prop) => {
                      setActiveControlName(prop);
                      setIsMenuShown(false);
                    }}
                  />
                }
              >
                {t({ en: "Controls", zh: "控件" })}
              </MenuButton>
            </div>
            <Button
              look="ghost"
              size="sm"
              css={styles.trailing}
              onClick={() => {
                dispatch({ type: "reset" });
                setActiveControlName(null);
              }}
            >
              {t({ en: "Reset", zh: "重置" })}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              look="ghost"
              icon={<XIcon weight="bold" />}
              aria-label={t({ en: "Close control", zh: "关闭控件" })}
              onClick={() => {
                setActiveControlName(null);
              }}
            />
            {/* The control carries the prop name as its accessible name, so
                the visible copy is hidden from assistive technology and the
                name is announced once. */}
            <span aria-hidden css={styles.propName}>
              <Text as="span" look="caption" tone="muted">
                <Identifier>{activeControl.name}</Identifier>
              </Text>
            </span>
            <div ref={controlRef} css={styles.control}>
              <LabControl
                control={activeControl}
                props={state.props}
                onChange={(value) => {
                  dispatch({
                    type: "setProp",
                    prop: activeControl.name,
                    value,
                  });
                }}
              />
            </div>
          </>
        )}
      </div>
    </Frame>
  );
}

function FixedFrame({ children }: { children: ReactNode }) {
  return (
    <div css={[styles.bar, styles.fixed]}>
      <EffectCarrier value="viewport-bottom">{children}</EffectCarrier>
    </div>
  );
}

function StickyFrame({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[styles.bar, styles.sticky, css]}>
      <EffectCarrier value={sticky}>{children}</EffectCarrier>
    </div>
  );
}

const styles = stylex.create({
  bar: {
    display: { default: "block", [labWidth.panelBeside]: "none" },
  },
  // Safari on iOS hit-tests the top centre of the viewport to colour the
  // status bar. A bar at the foot of the viewport never covers that point, so
  // it may run the full width.
  fixed: {
    position: "fixed",
    insetBlockEnd: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    zIndex: layer.header,
    // The floor the Canvas reserves under the snippet, so what the page keeps
    // clear and what the bar takes cannot drift apart.
    minBlockSize: labBar.clearance,
    paddingBlockStart: space._1,
    paddingBlockEnd: `calc(${space._1} + env(safe-area-inset-bottom))`,
    paddingInlineStart: pageGutter.inlineStart,
    paddingInlineEnd: pageGutter.inlineEnd,
  },
  // The bar floats above the foot of the viewport, as the sticky `FormFooter`
  // does. The page ends under the Lab with the padding of the docs frame
  // (`space._8`) and of the column of the shell (`space._6` and the safe
  // area). The margin takes the bar down through them, so at the end of the
  // page it rests where it sticks, and the bar alone gives the page no
  // scroll.
  sticky: {
    position: "sticky",
    insetBlockEnd: labBar.insetBlockEnd,
    zIndex: layer.raised,
    marginBlockEnd: `calc(-1 * (${space._8} + ${space._6} + env(safe-area-inset-bottom) - ${labBar.insetBlockEnd}))`,
    padding: space._1,
  },
  pane: {
    // The page runs under the whole width of the bar, so the lens takes a
    // deeper blur than a panel the size of a card.
    [glassTokens.blur]: "12px",
    position: "absolute",
    inset: 0,
  },
  paneFlush: {
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
  },
  row: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  trailing: {
    marginInlineStart: "auto",
  },
  propName: {
    fontFamily: font.familyMono,
  },
  control: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
