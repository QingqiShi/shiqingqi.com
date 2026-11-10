"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentType, type ReactNode } from "react";
import { navListStyles } from "../actions/nav-list-context.tsx";
import { tabLink } from "../actions/tab-bar.stylex.ts";
import {
  CountForReader,
  IconMark,
  countText,
  type TabBarItem,
  type TabBarLinkProps,
} from "../actions/tab-bar.tsx";
import { useTabPress } from "../actions/use-tab-press.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { segmentSurface } from "../forms/segment-track.stylex.ts";
import { useScrollMask } from "../hooks/use-scroll-mask.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { controlSize, font, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface RailProps {
  items: readonly TabBarItem[];
  label: string;
  effect: "liquid" | "none";
  linkComponent: ComponentType<TabBarLinkProps>;
  css?: StyleProp;
}

/**
 * The destinations in the rail, each an icon over a small label, in a
 * Scroll region for a rail too short to hold them all.
 *
 * @internal
 */
export function Rail({ label, css, ...track }: RailProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const navRef = useRef<HTMLElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(navRef, "vertical");
  return (
    <nav
      ref={mergeRefs(scroller, navRef)}
      aria-label={label}
      css={[styles.scroller, css]}
    >
      <div ref={content} css={styles.scrolled}>
        <EffectCarrier value={region}>
          <RailTrack
            {...track}
            form="icons"
            scrolls={showStartMask || showEndMask}
          />
        </EffectCarrier>
      </div>
    </nav>
  );
}

interface RailSidebarProps extends Omit<RailProps, "effect"> {
  secondary: ReactNode;
}

/**
 * The destinations in the labelled sidebar, each a row of an icon and a
 * label, with `secondary` under them. Both are in one Scroll region for a
 * sidebar too short to hold them.
 *
 * @internal
 */
export function RailSidebar({
  label,
  secondary,
  css,
  ...track
}: RailSidebarProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(scrollerRef, "vertical");
  return (
    <div ref={mergeRefs(scroller, scrollerRef)} css={[styles.scroller, css]}>
      <div ref={content} css={[stack.group, styles.scrolled]}>
        <EffectCarrier value={region}>
          <nav aria-label={label}>
            {/* The liquid rests in a pill as wide as a row is tall, so it
                cannot fill a row that is wider than tall. */}
            <RailTrack
              {...track}
              effect="none"
              form="labels"
              scrolls={showStartMask || showEndMask}
            />
          </nav>
          {secondary == null ? null : <div>{secondary}</div>}
        </EffectCarrier>
      </div>
    </div>
  );
}

interface RailTrackProps extends Omit<RailProps, "label" | "css"> {
  form: "icons" | "labels";
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
  form,
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
  const labels = form === "labels";
  const rowCorner = labels ? corner.radius_2 : corner.radius_3;
  return (
    <div
      {...track.props}
      css={[track.css, styles.track, labels && styles.trackLabels]}
    >
      <span {...track.hover} css={[rowCorner, track.hoverCss]} />
      {track.shown >= 0 ? (
        <span {...track.indicator} css={[rowCorner, track.indicatorCss]} />
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
                  labels ? typeRole.label : typeRole.caption,
                  a11y.touchRow,
                  transition.colors,
                  rowCorner,
                  styles.link,
                  labels
                    ? [navListStyles.rowInset, navListStyles.rowControl]
                    : styles.tile,
                  track.segmentCss(index),
                  isShown && !labels && tabLink.shown,
                  a11y.focusRingInset,
                )}
              >
                {labels ? (
                  <LabelledRow item={item} isShown={isShown} track={track} />
                ) : (
                  <>
                    <span css={[styles.icon, track.contentCss]} aria-hidden>
                      <item.icon weight={isShown ? "fill" : "bold"} />
                      <IconMark item={item} />
                    </span>
                    <span css={[styles.tileLabel, track.contentCss]}>
                      {item.label}
                    </span>
                    <CountForReader count={item.count} />
                  </>
                )}
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

function LabelledRow({
  item,
  isShown,
  track,
}: {
  item: TabBarItem;
  isShown: boolean;
  track: { contentCss: StyleProp };
}) {
  const count = countText(item.count);
  return (
    <>
      <span
        css={[
          navListStyles.icon,
          isShown && styles.rowIconShown,
          track.contentCss,
        ]}
        aria-hidden
      >
        <item.icon weight={isShown ? "fill" : "bold"} />
      </span>
      <span css={[truncate.base, styles.rowLabel, track.contentCss]}>
        {item.label}
      </span>
      {count === null && !item.badge ? null : (
        <span css={[navListStyles.trailing, track.contentCss]}>
          {item.badge ? (
            <span aria-hidden css={styles.rowBadge}>
              {item.badge}
            </span>
          ) : null}
          {count === null ? null : (
            <span css={[typeRole.caption, typeModifier.numeric]}> {count}</span>
          )}
        </span>
      )}
    </>
  );
}

const styles = stylex.create({
  scroller: {
    alignSelf: "stretch",
    minBlockSize: 0,
    overflowY: "auto",
  },
  scrolled: {
    position: "relative",
  },
  // The spring moves the indicator past the first and the last link. The
  // nav clips it there, but it also makes the nav scroll for a moment, so
  // the track clips it first.
  track: {
    overflow: "clip",
  },
  // A labelled row marks the current destination as a `NavLink` does.
  trackLabels: {
    [segmentSurface.fill]: color.bgControlSelected,
  },
  link: {
    display: "flex",
    minInlineSize: 0,
    color: {
      default: color.fgControl,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    textDecoration: "none",
    // A press on a destination can drag the indicator, so it does not
    // select the label.
    userSelect: "none",
  },
  tile: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    // The liquid rests in a shape as wide as the link, with round ends, so
    // it fits only in a link at least as tall as it is wide.
    aspectRatio: 1,
    paddingBlock: space._1,
    paddingInline: 0,
    fontWeight: font.weight_5,
  },
  icon: {
    position: "relative",
    display: "inline-flex",
    fontSize: controlSize._5,
  },
  // A label too long for the rail wraps between words. A word wider than
  // the rail hyphenates where the browser knows the language, and else ends
  // in an ellipsis. A break between any two letters, which the page allows,
  // makes the word hard to read.
  tileLabel: {
    maxInlineSize: "100%",
    minInlineSize: 0,
    overflow: "hidden",
    letterSpacing: font.trackingTight,
    textAlign: "center",
    textOverflow: "ellipsis",
    textWrap: "balance",
    overflowWrap: "normal",
    hyphens: "auto",
  },
  // A labelled row takes the styles of a `NavLink` row, so that a `NavList`
  // in `secondary` matches it. The current row is filled, and its icon is
  // filled in `fg`.
  rowIconShown: {
    color: color.fg,
  },
  rowLabel: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  rowBadge: {
    display: "inline-flex",
  },
});
