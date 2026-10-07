"use client";

import * as stylex from "@stylexjs/stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { getScrollBehavior } from "@tuja/ui/utils/get-scroll-behavior";
import { useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { centerInScrollX, offsetFromScrollCenterX } from "./center-in-scroll-x";

// font.cqTitle's container formula, in its parts. Inside the clamp the size
// grows BASE rem + SLOPE · cqi.
//
// Two departures from the real token keep the specimen honest:
//   • The real token sets a fixed 1.5rem from lg up, which would freeze this
//     specimen on wide screens.
//   • The real token uses cqmin. These cards contain only the inline axis, so
//     on a short viewport cqmin would track the viewport's height. cqi tracks
//     the card's width alone, which is what the cards claim to show.
const CLAMP_MIN_REM = 1.1;
const CLAMP_MAX_REM = 1.4;
const CLAMP_BASE_REM = 0.96;
const CLAMP_SLOPE = 1.56;
const REM_PX = 16;
const CQ_TITLE_CLAMP = `clamp(${CLAMP_MIN_REM.toString()}rem, ${CLAMP_BASE_REM.toString()}rem + ${CLAMP_SLOPE.toString()}cqi, ${CLAMP_MAX_REM.toString()}rem)`;

// The container width at which the clamp reaches its ceiling.
const CEIL_PX = Math.round(
  ((CLAMP_MAX_REM - CLAMP_BASE_REM) * REM_PX * 100) / CLAMP_SLOPE,
);

// Four real fixed-width containers. The widest lands on the ceiling. The
// browser sizes each title; the specimen only reads the result back.
const CARD_WIDTHS = [160, 240, 360, CEIL_PX];

export function ContainerScaleSpecimen() {
  const railRef = useRef<HTMLDivElement>(null);
  const cardElementsRef = useRef<Array<HTMLLIElement | null>>([]);
  const titleElementsRef = useRef<Array<HTMLParagraphElement | null>>([]);
  const [rems, setRems] = useState<Array<number | undefined>>([]);
  const [active, setActive] = useState(0);
  // While a slider-initiated scroll settles, ignore scroll-driven updates, or
  // the card nearest the centre overrides the card the slider just picked.
  const lockRef = useRef(false);
  const lockTimerRef = useRef(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let frame = 0;

    const measure = () => {
      const root = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      setRems(
        titleElementsRef.current.map((title) => {
          if (!title) return undefined;
          const px = Number.parseFloat(getComputedStyle(title).fontSize);
          return Math.round((px / root) * 100) / 100;
        }),
      );
    };

    const syncActive = () => {
      if (lockRef.current) return;
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      cardElementsRef.current.forEach((card, i) => {
        if (!card) return;
        const distance = Math.abs(offsetFromScrollCenterX(rail, card));
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setActive(nearest);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncActive);
    };

    measure();
    rail.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(lockTimerRef.current);
    };
  }, []);

  const scrollToCard = (index: number) => {
    const rail = railRef.current;
    const card = cardElementsRef.current[index];
    if (!rail || !card) return;
    lockRef.current = true;
    window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
    }, 500);
    centerInScrollX(rail, card, getScrollBehavior());
  };

  const handleSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setActive(next);
    scrollToCard(next);
  };

  const specimen = t({ en: "Kyoto in four days", zh: "京都四日" });
  const measuredWord = t({ en: "Measured", zh: "实测" });

  const activeRem = rems[active];
  const activeWidthText = `${CARD_WIDTHS[active].toString()}px`;
  const activeRemText =
    activeRem === undefined ? undefined : `${activeRem.toFixed(2)}rem`;
  const liveValue =
    activeRemText === undefined ? " " : `${activeWidthText} → ${activeRemText}`;

  return (
    <div css={stack.item}>
      <ScrollMask
        ref={railRef}
        orientation="horizontal"
        contentCss={[scrollX.base, styles.rail]}
      >
        <ul
          css={styles.cards}
          aria-label={t({
            en: "Cards at four container widths",
            zh: "四种容器宽度的卡片",
          })}
        >
          {CARD_WIDTHS.map((width, i) => {
            const rem = rems[i];
            const isActive = i === active;
            return (
              <li
                key={width}
                ref={(node) => {
                  cardElementsRef.current[i] = node;
                }}
                css={[
                  corner.radius_2,
                  styles.card,
                  isActive && styles.cardActive,
                  styles.cardWidth(`${width.toString()}px`),
                ]}
                aria-current={isActive ? "true" : undefined}
              >
                <div css={styles.cardInner}>
                  <span
                    css={[typeRole.caption, typeModifier.numeric, styles.mono]}
                  >
                    {width}px
                  </span>
                  <p
                    ref={(node) => {
                      titleElementsRef.current[i] = node;
                    }}
                    css={[
                      typeRole.cardTitle,
                      styles.specimen,
                      styles.specimenFontSize(CQ_TITLE_CLAMP),
                    ]}
                  >
                    {specimen}
                  </p>
                  <span
                    css={[
                      typeRole.caption,
                      typeModifier.numeric,
                      styles.mono,
                      styles.readout,
                      isActive && styles.readoutActive,
                    ]}
                  >
                    {rem === undefined ? "→ …" : `→ ${rem.toFixed(2)}rem`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollMask>

      <div css={[cluster.item, styles.controls]}>
        <p css={styles.live} aria-live="polite">
          <span css={[typeRole.overline, styles.mono]}>{measuredWord}</span>
          <span
            css={[
              typeRole.bodySmall,
              typeModifier.numeric,
              styles.mono,
              styles.liveValue,
            ]}
          >
            {liveValue}
          </span>
        </p>
        <input
          type="range"
          min={0}
          max={CARD_WIDTHS.length - 1}
          step={1}
          value={active}
          onChange={handleSlider}
          css={styles.slider}
          aria-label={t({
            en: "Step through container widths",
            zh: "逐级切换容器宽度",
          })}
          aria-valuetext={
            activeRemText === undefined
              ? activeWidthText
              : `${activeWidthText}, ${activeRemText}`
          }
        />
      </div>
    </div>
  );
}

const HAIRLINE = `inset 0 0 0 1px ${color.border}`;

const styles = stylex.create({
  rail: {
    // Let vertical swipes scroll the page; only claim horizontal panning.
    touchAction: "pan-x",
    scrollSnapType: {
      default: "x mandatory",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  cards: {
    display: "flex",
    alignItems: "stretch",
    gap: rhythm.item,
    listStyle: "none",
    margin: 0,
    padding: space._1,
    inlineSize: "max-content",
  },
  card: {
    flexShrink: 0,
    containerType: "inline-size",
    scrollSnapAlign: "center",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: HAIRLINE,
    transition:
      "box-shadow 0.18s ease, background-color 0.18s ease, color 0.18s ease",
  },
  cardActive: {
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  cardWidth: (inlineSize: string) => ({
    inlineSize,
  }),
  cardInner: {
    display: "flex",
    flexDirection: "column",
    blockSize: "100%",
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._3,
  },
  mono: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  specimen: {
    margin: 0,
    color: color.fg,
    overflowWrap: "break-word",
  },
  specimenFontSize: (fontSize: string) => ({
    fontSize,
  }),
  readout: {
    marginBlockStart: "auto",
  },
  readoutActive: {
    color: color.fgAccent,
    fontWeight: font.weight_6,
  },
  controls: {
    justifyContent: "space-between",
  },
  live: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    flexShrink: 0,
  },
  liveValue: {
    color: color.fg,
  },
  slider: {
    flexGrow: 1,
    flexBasis: "12rem",
    minInlineSize: 0,
    margin: 0,
    accentColor: color.bgAccent,
    cursor: "pointer",
  },
});
