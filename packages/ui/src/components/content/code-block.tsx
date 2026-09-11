"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment, useLayoutEffect, useRef } from "react";
import { scrollbar, scrollX } from "../../primitives/layout.stylex.ts";
import { easing, transition } from "../../primitives/motion.stylex.ts";
import { font } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
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
   * StyleX overrides merged last.
   *
   * @zh 最后合并的 StyleX 覆盖样式。
   */
  css?: StyleProp;
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

// A change that lands mid-move finds the move by its id, so the box starts
// from where it is seen rather than from where it was laid out.
const MOVE = "code-block-move";
const FADE = "code-block-fade";
const MOVE_MS = 260;
const ARRIVE_MS = 320;
const LEAVE_MS = 180;
const REDUCED_ARRIVE_MS = 150;
const RISE = "translateY(0.5rem)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

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

function translationOf(box: HTMLElement): Place {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(box).transform);
  return { left: matrix.e, top: matrix.f };
}

function move(box: HTMLElement, dx: number, dy: number) {
  box.animate(
    [
      { transform: `translate(${String(dx)}px, ${String(dy)}px)` },
      { transform: "none" },
    ],
    { id: MOVE, duration: MOVE_MS, easing: easing.entrance },
  );
}

function arrive(box: HTMLElement, isReduced: boolean) {
  if (isReduced) {
    box.animate([{ opacity: 0 }, { opacity: 1 }], {
      id: FADE,
      duration: REDUCED_ARRIVE_MS,
      easing: easing.ease,
    });
    return;
  }
  const timing = { duration: ARRIVE_MS, easing: easing.entrance };
  box.animate([{ opacity: 0 }, { opacity: 1 }], { id: FADE, ...timing });
  box.animate([{ transform: RISE }, { transform: "none" }], {
    id: MOVE,
    ...timing,
  });
}

/**
 * A part that has left the block fades where it stood. React has already let
 * go of its node, so the ghost is built from its tokens and lives outside the
 * tree, in a container React renders empty.
 */
function leave(
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
  const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
    id: FADE,
    duration: LEAVE_MS,
    easing: easing.ease,
    fill: "forwards",
  });
  const done = () => {
    ghost.remove();
  };
  fade.finished.then(done, done);
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

    // A change that lands mid-move starts from where the box is seen, not
    // from where it was laid out.
    const seen = new Map<HTMLElement, Place>();
    for (const box of boxes) {
      const inFlight = box
        .getAnimations()
        .find((animation) => animation.id === MOVE);
      if (inFlight === undefined) continue;
      seen.set(box, translationOf(box));
      inFlight.cancel();
    }

    const after = measure(code, boxes);
    placesRef.current = after;
    drawnRef.current = parts;
    if (drawn.length === 0) return;

    const isReduced = window.matchMedia(REDUCED_MOTION).matches;
    for (const box of boxes) {
      const key = box.dataset.box;
      if (key === undefined) continue;
      const to = after.get(key);
      const from = before.get(key);
      if (to === undefined) continue;
      if (from === undefined) {
        arrive(box, isReduced);
        continue;
      }
      const drift = seen.get(box) ?? { left: 0, top: 0 };
      const dx = from.left - to.left + drift.left;
      const dy = from.top - to.top + drift.top;
      if (!isReduced && (dx !== 0 || dy !== 0)) move(box, dx, dy);
    }

    const ghosts = ghostsRef.current;
    if (ghosts === null) return;
    const ids = new Set(parts.map((part) => part.id));
    for (const part of drawn) {
      if (ids.has(part.id)) continue;
      const place = before.get(part.id);
      if (place !== undefined) leave(ghosts, part.tokens, place);
    }
  }, [parts]);

  // The places on record go stale when the code is laid out again without a
  // change of its own: the mono font arriving, or the viewport resizing.
  useLayoutEffect(() => {
    const code = codeRef.current;
    if (code === null) return;
    const observer = new ResizeObserver(() => {
      if (code.getAnimations({ subtree: true }).length > 0) return;
      placesRef.current = measure(code, boxesIn(code));
    });
    observer.observe(code);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <code ref={codeRef} css={styles.code}>
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
 * wide line never widens the page.
 *
 * The boxes animate on the page's own DOM rather than as view-transition
 * snapshots, because a snapshot escapes the scroller's clip.
 */
export function CodeBlock({ source, parts, css }: CodeBlockProps) {
  return (
    <div
      tabIndex={0}
      css={[
        scrollX.base,
        scrollX.focusRing,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
        css,
      ]}
    >
      <pre css={styles.pre}>
        {source !== undefined ? (
          <code css={styles.code}>{runs(source)}</code>
        ) : (
          <PartsCode parts={parts} />
        )}
      </pre>
    </div>
  );
}

const styles = stylex.create({
  scroller: {
    minInlineSize: 0,
  },
  pre: {
    margin: 0,
  },
  code: {
    display: "block",
    position: "relative",
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
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
