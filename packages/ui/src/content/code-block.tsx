"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { bind } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import { createMotionValue } from "../motion/create-motion-value.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import { playLayout, type Rect } from "../motion/play-layout.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { duration, easing, transition } from "../primitives/motion.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { observeChildren } from "../surfaces/observe-children.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import { border, color, font } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { codeRun } from "./code-run.stylex.ts";
import { syntax } from "./syntax.stylex.ts";
import type { CodeToken } from "./token-kinds.ts";

export type { CodeToken, CodeTokenKind } from "./token-kinds.ts";

export interface CodePart {
  /**
   * Stable across states: the part's key, and what the animation tracks.
   *
   * @zh 在各状态间保持稳定：part 的 key，也是动画追踪的依据。
   */
  id: string;
  /**
   * The whitespace before the part. It stays outside the part's box, because
   * a box that holds a line break has no one place to measure.
   *
   * @zh part 之前的空白。它留在 part 的盒子之外，因为容纳换行的盒子没有单一可测量的位置。
   */
  lead: string;
  /**
   * The runs the part draws, in source order.
   *
   * @zh part 按源码顺序绘制的片段。
   */
  tokens: readonly CodeToken[];
}

interface CodeBlockBaseProps {
  /**
   * The accessible name of the block, such as "Code". When a line is wider
   * than the block, the block becomes a region with this name that the
   * keyboard can focus and scroll. The package ships no i18n, so the name
   * comes in as a prop.
   *
   * @zh 代码块的无障碍名称，例如“代码”。当某一行比代码块更宽时，代码块会成为带有此名称的区域，可以用键盘聚焦并滚动。本包不含 i18n，因此名称由调用方传入。
   */
  label: string;
  /**
   * StyleX overrides merged last, on the block's root — how it sits in the
   * layout around it.
   *
   * @zh 最后合并的 StyleX 覆盖样式，作用于代码块的根元素——控制它在周围布局中的位置。
   */
  css?: StyleProp;
  /**
   * StyleX styles merged last, on the scroller inside the block. Put the
   * padding that sets the code in from the edge here, because the code
   * scrolls under this padding to the edge.
   *
   * @zh 最后合并的 StyleX 样式，作用于代码块内部的滚动元素。让代码与边缘保持距离的内边距应写在这里，因为代码会在这段内边距下一直滚动到边缘。
   */
  contentCss?: StyleProp;
}

type CodeBlockProps = CodeBlockBaseProps &
  (
    | {
        /**
         * The runs to draw, in source order, for a snippet that never changes.
         *
         * @zh 按源码顺序绘制的片段，用于永不改动的代码片段。
         */
        source: readonly CodeToken[];
        parts?: undefined;
      }
    | {
        /**
         * The parts to draw. A part whose id stays keeps its box across a
         * change.
         *
         * @zh 要绘制的 parts。id 保持不变的 part，会在改动前后保留同一个盒子。
         */
        parts: readonly CodePart[];
        source?: undefined;
      }
  );

/** Where a box sits, from the code's own corner, so scrolling does not move it. */
interface Place {
  left: number;
  top: number;
}

const PART_SPRING = springOf(springRoles.surface);
const LEAVE = cssTween(duration._200, easing.ease);
const REDUCED_ARRIVE = cssTween(duration._150, easing.ease);
/** How far below its place, in rem, a part starts to rise. */
const RISE_REM = 0.5;

function runs(tokens: readonly CodeToken[]) {
  return tokens.map(([kind, text], index) => (
    <span key={index} css={codeRun[kind]}>
      {text}
    </span>
  ));
}

function boxesIn(code: HTMLElement): HTMLElement[] {
  return [...code.querySelectorAll<HTMLElement>("[data-box]")];
}

function measure(code: HTMLElement, boxes: readonly HTMLElement[]) {
  const origin = code.getBoundingClientRect();
  const places = new Map<string, Place>();
  for (const box of boxes) {
    const key = box.dataset.box;
    if (key === undefined) continue;
    const rect = box.getBoundingClientRect();
    places.set(key, {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
    });
  }
  return places;
}

const STILL: Place = { left: 0, top: 0 };

/** How far the move of `playLayout` shows `box` from its place now. */
function translationOf(box: HTMLElement): Place {
  const { translate } = getComputedStyle(box);
  if (translate === "" || translate === "none") return STILL;
  const [left = 0, top = 0] = translate.split(" ").map(Number.parseFloat);
  return { left, top };
}

/** A part rises into its place as it fades in, or only fades in under reduced motion. */
function arrive(engine: MotionEngine, box: HTMLElement) {
  const shown = createMotionValue(engine, 0, { spring: PART_SPRING });
  const binding = bind(box, shown, {
    pose: (t) => ({
      opacity: unit(t).toFixed(3),
      transform: `translateY(${((1 - t) * RISE_REM).toFixed(4)}rem)`,
    }),
    reducedPose: (t) => ({ opacity: unit(t).toFixed(3) }),
    rest: "clear",
  });
  void shown.to(1, { reduced: REDUCED_ARRIVE }).finished.then(() => {
    binding.unbind();
  });
}

/**
 * A part that has left the block fades where it stood. React has already let
 * go of its node, so the ghost is built from its tokens and lives outside the
 * tree, in a container React renders empty.
 */
function leave(
  engine: MotionEngine,
  container: HTMLElement,
  tokens: readonly CodeToken[],
  place: Place,
) {
  const ghost = document.createElement("span");
  const props = stylex.props(
    styles.box,
    styles.ghost,
    styles.at(place.left, place.top),
  );
  ghost.className = props.className ?? "";
  Object.assign(ghost.style, props.style);
  ghost.setAttribute("aria-hidden", "true");
  for (const [kind, text] of tokens) {
    const run = document.createElement("span");
    run.className = stylex.props(codeRun[kind]).className ?? "";
    run.textContent = text;
    ghost.append(run);
  }
  container.append(ghost);
  const shown = createMotionValue(engine, 1);
  const binding = bind(ghost, shown, {
    pose: (t) => ({ opacity: t.toFixed(3) }),
  });
  void shown.to(0, { tween: LEAVE }).finished.then(() => {
    binding.unbind();
    ghost.remove();
  });
}

interface PartsCodeProps {
  parts: readonly CodePart[];
}

/**
 * Draws `parts` as boxes that can slide, rise, or fade when they change:
 * what stays slides to its new place, what arrives rises in, and what leaves
 * fades where it stood.
 */
function PartsCode({ parts }: PartsCodeProps) {
  const engine = useMotionEngine();
  const codeRef = useRef<HTMLElement>(null);
  const ghostsRef = useRef<HTMLSpanElement>(null);
  const placesRef = useRef<Map<string, Place>>(new Map());
  const drawnRef = useRef<readonly CodePart[]>([]);

  useLayoutEffect(() => {
    const code = codeRef.current;
    if (code === null) return;
    const boxes = boxesIn(code);
    const before = placesRef.current;
    const drawn = drawnRef.current;

    // Where each box that stays shows now, mid-move included, in the places
    // of the layout before the change.
    const rects = new Map<Element, Rect>();
    const isDrifting = engine.isMoving;
    for (const box of boxes) {
      const key = box.dataset.box;
      const from = key === undefined ? undefined : before.get(key);
      if (from === undefined) continue;
      const drift = isDrifting ? translationOf(box) : STILL;
      rects.set(box, {
        x: from.left + drift.left,
        y: from.top + drift.top,
        width: 0,
        height: 0,
      });
    }

    const after = engine.measure(() => measure(code, boxes));
    placesRef.current = after;
    drawnRef.current = parts;
    if (drawn.length === 0) return;

    playLayout(
      engine,
      { origin: code, rectOf: (element) => rects.get(element) },
      boxes,
      { spring: PART_SPRING },
    );
    for (const box of boxes) {
      const key = box.dataset.box;
      if (key !== undefined && !before.has(key)) arrive(engine, box);
    }

    const ghosts = ghostsRef.current;
    if (ghosts === null) return;
    const ids = new Set(parts.map((part) => part.id));
    for (const part of drawn) {
      if (ids.has(part.id)) continue;
      const place = before.get(part.id);
      if (place !== undefined) leave(engine, ghosts, part.tokens, place);
    }
  }, [engine, parts]);

  // The places on record go stale when the code is laid out again without a
  // change of its own: the mono font arriving, or the viewport resizing.
  useLayoutEffect(() => {
    const code = codeRef.current;
    if (code === null) return;
    const observer = new ResizeObserver(() => {
      if (engine.isMoving) return;
      placesRef.current = measure(code, boxesIn(code));
    });
    observer.observe(code);
    return () => {
      observer.disconnect();
    };
  }, [engine]);

  return (
    <code ref={codeRef} css={[typeRole.bodySmall, styles.code]}>
      {parts.map((part) => (
        <Fragment key={part.id}>
          {part.lead}
          <span data-box={part.id} css={styles.box}>
            {runs(part.tokens)}
          </span>
        </Fragment>
      ))}
      <span ref={ghostsRef} />
    </code>
  );
}

/**
 * Draws a snippet as coloured runs. `source` draws plain runs, for a snippet
 * that never changes; `parts` draws boxes that animate, so a change of parts
 * plays like a code-walkthrough slide. The block scrolls inside itself, so a
 * wide line never widens the page, and a Scroll mask marks each edge it can
 * still scroll to.
 *
 * Put the block against the edges of its container, with no padding around
 * it. The Scroll mask blurs the code at the edges of the block, so padding
 * around the block puts a gap between the blur and the container edge. To
 * set the code in from the edge, give the padding in `contentCss`. The focus
 * ring is inside the block, so it stays in the container too.
 *
 * The boxes animate on the page's own DOM rather than as view-transition
 * snapshots, because a snapshot escapes the scroller's clip.
 */
export function CodeBlock({
  source,
  parts,
  label,
  css,
  contentCss,
}: CodeBlockProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    return observeChildren(
      scroller,
      () => {
        setIsOverflowing(scroller.scrollWidth > scroller.clientWidth);
      },
      { includeContainer: true },
    );
  }, []);

  return (
    <ScrollMask
      ref={scrollerRef}
      orientation="horizontal"
      {...(isOverflowing && {
        tabIndex: 0,
        role: "region",
        "aria-label": label,
      })}
      onFocus={(event) => {
        setIsFocusVisible(event.target.matches(":focus-visible"));
      }}
      onBlur={() => {
        setIsFocusVisible(false);
      }}
      css={[
        corner.radius_2,
        styles.ring,
        isFocusVisible && styles.ringShown,
        css,
      ]}
      contentCss={[
        styles.scroller,
        scrollX.base,
        scrollbar.autoHide,
        transition.scrollbarColor,
        contentCss,
      ]}
    >
      <pre css={styles.pre}>
        {source !== undefined ? (
          <code css={[typeRole.bodySmall, styles.code]}>{runs(source)}</code>
        ) : (
          <PartsCode parts={parts} />
        )}
      </pre>
    </ScrollMask>
  );
}

const styles = stylex.create({
  // The Scroll mask's bands blur what is below them, so a ring on the
  // scroller shows as a blur at the edges. Thus the ring is on a layer above
  // the bands, inside the block, so it stays in a container that has the
  // block on its edges.
  scroller: {
    outlineColor: "transparent",
  },
  ring: {
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      cornerShape: "inherit",
      outlineWidth: border.size_2,
      outlineStyle: "solid",
      outlineOffset: `calc(-1 * ${border.size_2})`,
      outlineColor: "transparent",
      pointerEvents: "none",
    },
  },
  ringShown: {
    "::after": {
      outlineColor: color.borderAccent,
    },
  },
  // The box takes the width of its longest line, so the scroller's
  // inline-end padding comes after the code when it is scrolled to the end.
  pre: {
    inlineSize: "max-content",
    minInlineSize: "100%",
    margin: 0,
  },
  code: {
    display: "block",
    position: "relative",
    fontFamily: font.familyMono,
    // Code is not running text, so it does not take the taller leading of
    // Chinese body text.
    lineHeight: font.lineHeight_4,
    color: syntax.plain,
    whiteSpace: "pre",
  },
  // A box that fragments across lines has no one place to measure, so each
  // part takes a box of its own.
  box: {
    display: "inline-block",
  },
  ghost: {
    position: "absolute",
    pointerEvents: "none",
  },
  at: (left: number, top: number) => ({
    left: `${String(left)}px`,
    top: `${String(top)}px`,
  }),
});
