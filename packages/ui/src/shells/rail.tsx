"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentType } from "react";
import { tabLink } from "../actions/tab-bar.stylex.ts";
import type { TabBarItem, TabBarLinkProps } from "../actions/tab-bar.tsx";
import { useTabPress } from "../actions/use-tab-press.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { useScrollMask } from "../hooks/use-scroll-mask.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { controlSize, font, rhythm, space } from "../tokens.stylex.ts";

interface RailProps {
  items: readonly TabBarItem[];
  label: string;
  effect: "liquid" | "none";
  linkComponent: ComponentType<TabBarLinkProps>;
}

/**
 * The destinations in the rail, in a Scroll region for a rail too short to
 * hold them all.
 *
 * @internal
 */
export function Rail({ label, ...track }: RailProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const navRef = useRef<HTMLElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(navRef, "vertical");
  return (
    <nav ref={mergeRefs(scroller, navRef)} aria-label={label} css={styles.nav}>
      <div ref={content} css={styles.navContent}>
        <EffectCarrier value={region}>
          <RailTrack {...track} scrolls={showStartMask || showEndMask} />
        </EffectCarrier>
      </div>
    </nav>
  );
}

interface RailTrackProps extends Omit<RailProps, "label"> {
  scrolls: boolean;
}

/**
 * The current destination under an indicator that moves down and up the
 * rail as the one on a `TabBar` moves across it.
 */
function RailTrack({
  items,
  effect,
  linkComponent: LinkComponent,
  scrolls,
}: RailTrackProps) {
  const current = items.findIndex((item) => item.current === true);
  const track = useTabPress({
    current,
    effect,
    surface: "flat",
    orientation: "vertical",
    scrolls,
    hoverSurface: true,
  });
  return (
    <div {...track.props} css={[track.css, styles.track]}>
      <span {...track.hover} css={[corner.radius_3, track.hoverCss]} />
      {track.shown >= 0 ? (
        <span
          {...track.indicator}
          css={[corner.radius_3, track.indicatorCss]}
        />
      ) : null}
      {/* `role="list"` survives the marker reset, which otherwise drops
            list semantics in Safari/VoiceOver. */}
      <ul role="list" css={stack.rows}>
        {items.map((item, index) => {
          const isShown = index === track.shown;
          return (
            <li key={item.href}>
              <LinkComponent
                href={item.href}
                aria-current={item.current === true ? "page" : undefined}
                {...track.segment(index)}
                {...stylex.props(
                  typeRole.caption,
                  a11y.touchRow,
                  transition.colors,
                  corner.radius_3,
                  styles.link,
                  track.segmentCss(index),
                  isShown && tabLink.shown,
                  a11y.focusRingInset,
                )}
              >
                <span css={styles.icon} aria-hidden>
                  <item.icon weight={isShown ? "fill" : "bold"} />
                  {item.badge ? (
                    <span css={styles.badge}>{item.badge}</span>
                  ) : null}
                </span>
                <span css={styles.label}>{item.label}</span>
                {item.status === undefined ? null : (
                  <>
                    {" "}
                    <span css={a11y.srOnly} role="status">
                      {item.status}
                    </span>
                  </>
                )}
              </LinkComponent>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const styles = stylex.create({
  nav: {
    alignSelf: "stretch",
    minBlockSize: 0,
    overflowY: "auto",
  },
  navContent: {
    position: "relative",
  },
  // The spring moves the indicator past the first and the last link. The
  // nav clips it there, but it also makes the nav scroll for a moment, so
  // the track clips it first.
  track: {
    overflow: "clip",
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
    // The liquid rests in a shape as wide as the link, with round ends, so
    // it fits only in a link at least as tall as it is wide.
    aspectRatio: 1,
    paddingBlock: space._1,
    paddingInline: 0,
    color: {
      default: color.fgControl,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    fontWeight: font.weight_5,
    textDecoration: "none",
    // A press on a destination can drag the indicator, so it does not
    // select the label.
    userSelect: "none",
  },
  icon: {
    position: "relative",
    display: "inline-flex",
    fontSize: controlSize._5,
  },
  badge: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: `calc(-1 * ${space._0})`,
    display: "flex",
  },
  // A label too long for the rail wraps, and it breaks inside a word only
  // where the word alone is wider than the rail.
  label: {
    maxInlineSize: "100%",
    minInlineSize: 0,
    letterSpacing: font.trackingTight,
    textAlign: "center",
    textWrap: "balance",
    overflowWrap: "anywhere",
  },
});
