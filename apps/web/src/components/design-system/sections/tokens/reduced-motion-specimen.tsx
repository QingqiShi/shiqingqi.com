"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { animate, transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useState, useSyncExternalStore } from "react";
import { t } from "#src/i18n.ts";
import { measure } from "../../measure.stylex.ts";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => {
    query.removeEventListener("change", onStoreChange);
  };
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** The server cannot know the preference; the store corrects it on hydration. */
function getServerSnapshot() {
  return false;
}

/**
 * Two presets running live, named against whichever branch the visitor's own
 * system is currently asking for. Reading the setting rather than describing it
 * is the point: change it and this updates in place.
 */
export function ReducedMotionSpecimen() {
  const reduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [moved, setMoved] = useState(false);

  const send = t({ en: "Send it across", zh: "让它移过去" });
  const sendBack = t({ en: "Send it back", zh: "让它移回来" });
  const fullLabel = t({ en: "Full motion", zh: "完整动效" });
  const reducedLabel = t({ en: "Reduced motion", zh: "减弱动效" });
  const fullNote = t({
    en: "The tile travels, and the bar keeps pulsing. Turn the setting on in your system and both change on this page, with no reload.",
    zh: "方块会一路移过去，条形持续闪动。在系统里打开该设置，这两者都会就地改变，无需刷新。",
  });
  const reducedNote = t({
    en: "The tile arrives without travelling, and the bar holds still. Turn the setting off and both change on this page, with no reload.",
    zh: "方块直接到位，不再移动；条形保持静止。在系统里关闭该设置，这两者都会就地改变，无需刷新。",
  });

  return (
    <div css={[corner.radius_2, styles.panel]}>
      <div css={[flex.wrap, styles.demos]}>
        <div css={[flex.col, styles.demo]}>
          <span css={styles.preset}>transition.transform</span>
          <span css={[corner.radius_2, styles.track]} aria-hidden>
            <span
              css={[
                corner.radius_2,
                styles.tile,
                transition.transform,
                moved && styles.tileEnd,
              ]}
            />
          </span>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMoved((value) => !value);
              }}
            >
              {moved ? sendBack : send}
            </Button>
          </span>
        </div>
        <div css={[flex.col, styles.demo]}>
          <span css={styles.preset}>animate.pulse</span>
          <span css={[corner.radius_2, styles.track]} aria-hidden>
            <span css={[corner.radius_1, styles.bar, animate.pulse]} />
          </span>
        </div>
      </div>
      {/* Not a live region: this only changes when someone deliberately changes
          their own system setting, and hydration would announce it on load. */}
      <div css={[flex.col, styles.readout]}>
        <span>
          <Badge variant={reduced ? "accent" : "default"}>
            {reduced ? reducedLabel : fullLabel}
          </Badge>
        </span>
        <p css={styles.readoutText}>{reduced ? reducedNote : fullNote}</p>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // Readout beside the demos once the panel is wide enough for both, measured
  // against the panel rather than the viewport.
  panel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
    gap: space._5,
    alignItems: "start",
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  demos: {
    gap: space._5,
    alignItems: "flex-start",
  },
  demo: {
    gap: space._2,
    alignItems: "flex-start",
    minInlineSize: 0,
  },
  preset: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    overflowWrap: "anywhere",
  },
  // Sized so the tile's 300% travel lands it flush against the far edge.
  track: {
    position: "relative",
    display: "block",
    inlineSize: "12rem",
    maxInlineSize: "100%",
    blockSize: space._8,
    overflow: "hidden",
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  tile: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: space._8,
    blockSize: space._8,
    backgroundColor: color.accent,
    transform: "translateX(0)",
  },
  tileEnd: {
    transform: "translateX(300%)",
  },
  bar: {
    position: "absolute",
    insetBlock: space._2,
    insetInline: space._2,
    backgroundColor: color.accent,
  },
  readout: {
    gap: space._2,
    alignItems: "flex-start",
    minInlineSize: 0,
  },
  readoutText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
    minInlineSize: 0,
  },
});
