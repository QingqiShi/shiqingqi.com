"use client";

import * as stylex from "@stylexjs/stylex";
import {
  nearestPaletteTone,
  paletteHues,
  parseColor,
  withAlpha,
} from "@tuja/ui/author/palette-match";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// Palette-only color picker. The design system is built on a fixed tonal
// palette, so author mode must not offer arbitrary colors — a native
// `<input type="color">` invites picks that don't exist in the system. Instead
// this exposes exactly the system palette: the user chooses a hue + tone, and we
// commit that swatch (carrying over the token's existing alpha for translucent
// recipes). Every commit is therefore already an exact palette tone, so the
// apply's snap-to-nearest is a no-op (drift stays null).
//
// The grid lives in the top layer via the native Popover API, which escapes the
// sidebar's scroll-clipping and gives light-dismiss + Escape for free.

interface PalettePickerProps {
  /** The token's logical path, e.g. "color.bgCanvas" — used for labelling. */
  path: string;
  /** The resolved current color (rgb()/rgba()/hex). */
  value: string;
  /** Commit a chosen palette color. */
  onPick: (value: string) => void;
}

export function PalettePicker({ path, value, onPick }: PalettePickerProps) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const match = nearestPaletteTone(value);
  const alpha = parseColor(value)?.a ?? 1;
  const hueLabel =
    paletteHues.find((hue) => hue.hue === match?.hue)?.label ?? "";
  const name = match ? `${hueLabel} · ${String(match.tone)}` : "Off-palette";

  // Pin the top-layer popover to the trigger. `clamp` is skipped on the
  // pre-open pass (the popover has no measurable size yet) and applied once it's
  // open, keeping it inside the viewport and flipping above the trigger when it
  // would overflow the bottom.
  const place = useCallback((clamp: boolean) => {
    const trigger = triggerRef.current;
    const pop = popoverRef.current;
    if (!trigger || !pop) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    let left = rect.left;
    let top = rect.bottom + gap;
    if (clamp) {
      const width = pop.offsetWidth;
      const height = pop.offsetHeight;
      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - width - margin),
      );
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - gap - height);
      }
    }
    pop.style.left = `${String(left)}px`;
    pop.style.top = `${String(top)}px`;
  }, []);

  // While open, keep the popover anchored as either scroll container moves (the
  // trigger lives inside the scrollable sidebar) or the window resizes.
  useEffect(() => {
    if (!open) return;
    // rAF-coalesce so a burst of scroll events triggers at most one layout
    // read/write per frame instead of forcing a reflow on every event.
    let frame = 0;
    const reposition = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        place(true);
      });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-author-control=""
        popoverTarget={popoverId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${path} — choose a palette color`}
        css={styles.trigger}
      >
        <span
          aria-hidden
          css={styles.triggerSwatch}
          style={{ backgroundColor: value }}
        />
        <span css={styles.triggerName}>{name}</span>
        <span css={styles.triggerHex}>{match ? match.hex : value}</span>
        <span aria-hidden css={[styles.chevron, open && styles.chevronOpen]}>
          ▾
        </span>
      </button>

      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        aria-label="System palette"
        css={styles.popover}
        onBeforeToggle={(event) => {
          if (event.newState === "open") place(false);
        }}
        onToggle={(event) => {
          const isOpen = event.newState === "open";
          setOpen(isOpen);
          if (!isOpen) return;
          place(true);
          const pop = popoverRef.current;
          const target =
            pop?.querySelector<HTMLButtonElement>('[data-selected="true"]') ??
            pop?.querySelector<HTMLButtonElement>("button");
          target?.focus();
        }}
      >
        <div css={styles.head}>
          <span css={styles.headTitle}>Palette</span>
          <span css={styles.headValue}>
            {match ? `${match.hue}._${String(match.tone)}` : value}
          </span>
        </div>
        {paletteHues.map((hue) => (
          <div key={hue.hue} css={styles.hueRow}>
            <span css={styles.hueLabel}>{hue.label}</span>
            <div css={styles.ramp}>
              {hue.tones.map((swatch) => {
                const selected =
                  match?.hue === hue.hue && match.tone === swatch.tone;
                return (
                  <button
                    key={swatch.tone}
                    type="button"
                    data-selected={selected}
                    aria-label={`${hue.label} ${String(swatch.tone)}`}
                    aria-pressed={selected}
                    title={`${hue.hue}._${String(swatch.tone)}`}
                    css={[styles.swatch, selected && styles.swatchSelected]}
                    style={{ backgroundColor: swatch.hex, color: swatch.fg }}
                    onClick={() => {
                      onPick(withAlpha(swatch.hex, alpha));
                      popoverRef.current?.hidePopover();
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const HAIRLINE = `inset 0 0 0 1px ${color.neutralBorder}`;

const styles = stylex.create({
  trigger: {
    appearance: "none",
    inlineSize: "100%",
    display: "flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._0,
    paddingInline: space._1,
    minBlockSize: space._6,
    backgroundColor: color.bgSurfaceSunken,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_1,
    color: color.textMain,
    cursor: "pointer",
    textAlign: "start",
  },
  triggerSwatch: {
    inlineSize: space._4,
    blockSize: space._4,
    flexShrink: 0,
    borderRadius: border.radius_1,
    boxShadow: HAIRLINE,
  },
  triggerName: {
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
  },
  triggerHex: {
    marginInlineStart: "auto",
    flexShrink: 0,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMuted,
    whiteSpace: "nowrap",
  },
  chevron: {
    flexShrink: 0,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    transitionProperty: "transform",
    transitionDuration: "160ms",
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  popover: {
    position: "fixed",
    margin: 0,
    inset: "auto",
    inlineSize: "min(360px, 92vw)",
    maxBlockSize: "min(70vh, 520px)",
    overflowY: "auto",
    padding: space._2,
    // Hidden until invoked; the UA `display:none` for a closed popover would be
    // clobbered by an unconditional `display`, so gate it on `:popover-open`.
    display: { default: "none", ":popover-open": "flex" },
    flexDirection: "column",
    gap: space._1,
    backgroundColor: color.bgSurfaceRaised,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_2,
    boxShadow: `${HAIRLINE}, 0 12px 32px rgba(0,0,0,0.24)`,
    zIndex: layer.toaster,
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    paddingBlockEnd: space._0,
  },
  headTitle: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
    color: color.textMuted,
  },
  headValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  hueRow: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  hueLabel: {
    flexShrink: 0,
    inlineSize: space._9,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: font.uiOverline,
    color: color.textMuted,
  },
  ramp: {
    flexGrow: 1,
    minInlineSize: 0,
    display: "grid",
    gridTemplateColumns: "repeat(21, 1fr)",
    gap: "1px",
  },
  swatch: {
    appearance: "none",
    position: "relative",
    blockSize: space._4,
    minInlineSize: 0,
    padding: 0,
    border: "none",
    borderRadius: border.radius_1,
    cursor: "pointer",
    outline: "none",
    transitionProperty: "transform, box-shadow",
    transitionDuration: "120ms",
    transform: {
      default: "none",
      ":hover": "scale(1.35)",
      ":focus-visible": "scale(1.35)",
    },
    zIndex: {
      default: 0,
      ":hover": 2,
      ":focus-visible": 2,
    },
    boxShadow: {
      default: "none",
      ":hover": `0 0 0 1px ${color.bgSurfaceRaised}, ${shadow._3}`,
      ":focus-visible": `0 0 0 1px ${color.bgSurfaceRaised}, ${shadow._3}`,
    },
  },
  swatchSelected: {
    zIndex: 1,
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "currentColor",
    outlineOffset: "-3px",
  },
});
