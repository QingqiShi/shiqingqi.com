"use client";

import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, layer, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { Identifier } from "../identifier.tsx";
import { labBar } from "./lab-bar.stylex.ts";
import { LabControl } from "./lab-control.tsx";
import type { LabAction, LabState } from "./lab-reducer.ts";
import { LabSheet } from "./lab-sheet.tsx";
import type { LabControlModel, LabVariantChoice } from "./types.ts";

const FOCUSABLE = [
  'button:not([tabindex="-1"])',
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface LabBarProps {
  variants: readonly LabVariantChoice[];
  controls: readonly LabControlModel[];
  state: LabState;
  /** Already wrapped in a transition, so every change animates the Canvas. */
  dispatch: (action: LabAction) => void;
}

/**
 * The Lab's controls below `md`: a bar of Glass at the foot of the viewport,
 * carrying either the way into the Sheet or the one control the visitor is
 * tuning. The Specimen keeps the rest of the screen.
 */
export function LabBar({ variants, controls, state, dispatch }: LabBarProps) {
  // Only the bar pins one control beside the Specimen; the desktop panel shows
  // every control at once, so neither piece of state belongs in the reducer.
  const [activeControlName, setActiveControlName] = useState<string | null>(
    null,
  );
  const [isSheetShown, setIsSheetShown] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const shownControlRef = useRef(activeControlName);

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
    <div css={styles.bar}>
      {/* Glass on a layer of its own, not on the bar itself: a
          `backdrop-filter` makes a containing block for fixed children, which
          would trap the Sheet's backdrop and its Progressive blur inside the
          bar. */}
      <div
        css={[corner.radius_3, glassSurface.base, styles.pane]}
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
                open={isSheetShown}
                onOpenChange={setIsSheetShown}
                buttonProps={{
                  type: "button",
                  size: "sm",
                  icon: <SlidersHorizontalIcon />,
                }}
                menuContent={
                  <LabSheet
                    variants={variants}
                    controls={controls}
                    variantId={state.variantId}
                    props={state.props}
                    onSelectVariant={(variantId) => {
                      dispatch({ type: "selectVariant", variantId });
                      setActiveControlName(null);
                      setIsSheetShown(false);
                    }}
                    onOpenControl={(prop) => {
                      setActiveControlName(prop);
                      setIsSheetShown(false);
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
              icon={<XIcon />}
              aria-label={t({ en: "Close control", zh: "关闭控件" })}
              onClick={() => {
                setActiveControlName(null);
              }}
            />
            {/* The control carries the prop name as its accessible name, so
                the visible copy is hidden from assistive technology and the
                name is announced once. */}
            <span aria-hidden css={styles.propName}>
              <Identifier>{activeControl.name}</Identifier>
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
    </div>
  );
}

const styles = stylex.create({
  // Safari on iOS hit-tests the top centre of the viewport to colour the
  // status bar. A bar at the foot of the viewport never covers that point, so
  // it may run the full width.
  bar: {
    display: { default: "block", [breakpoints.md]: "none" },
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
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  pane: {
    // The page runs under the whole width of the bar, so the lens takes a
    // deeper blur than a panel the size of a card.
    [glassTokens.blur]: "12px",
    position: "absolute",
    inset: 0,
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
  },
  row: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
  },
  trailing: {
    marginInlineStart: "auto",
  },
  propName: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  control: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
