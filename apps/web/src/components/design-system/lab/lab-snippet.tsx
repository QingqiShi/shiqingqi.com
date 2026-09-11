"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar, scrollX } from "@tuja/ui/primitives/layout.stylex";
import { easing, transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { Fragment, useLayoutEffect, useRef, ViewTransition } from "react";
import { t } from "#src/i18n.ts";
import { codeRun } from "../code/code-run.stylex.ts";
import { syntax } from "../code/syntax.stylex.ts";
import type { CodeToken } from "../code/types.ts";
import {
  textOf,
  type LabSnippet as LabSnippetModel,
  type LabSnippetPart,
} from "./build-lab-snippet.ts";
import { labEyebrow } from "./lab-eyebrow.stylex.ts";

interface LabSnippetProps {
  snippet: LabSnippetModel;
}

/** Where a box sits, from the code's own corner, so scrolling does not move it. */
interface Place {
  left: number;
  top: number;
}

/**
 * The card stays live through the page's view transition, so the ids name the
 * animations the card runs on its own boxes: a moved box slides, an arriving
 * box rises and fades in, a leaving one fades where it was.
 */
const MOVE = "lab-move";
const FADE = "lab-fade";
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

function valueKey(part: LabSnippetPart) {
  return `${part.id}:${textOf(part.value ?? [])}`;
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
 * A run that has left the code fades where it stood. React has already let
 * go of its nodes, so the ghost is built from the tokens and lives outside
 * the tree, in a container React renders empty.
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

/**
 * The code for what is on the Canvas, on the same raised card a documentation
 * page's usage sample takes. Every part is a box of its own, and a change
 * plays like a code-walkthrough slide: what stays slides to its new place,
 * what arrives rises in, and what leaves fades where it was.
 *
 * The boxes animate on the page's own DOM rather than as view-transition
 * snapshots, because a snapshot escapes the card's clip: on a narrow screen
 * the code is wider than the card, and a snapshot would draw over its edge.
 */
export function LabSnippet({ snippet }: LabSnippetProps) {
  const codeRef = useRef<HTMLElement>(null);
  const ghostsRef = useRef<HTMLSpanElement>(null);
  const placesRef = useRef<Map<string, Place>>(new Map());
  const drawnRef = useRef<readonly LabSnippetPart[]>([]);

  useLayoutEffect(() => {
    const code = codeRef.current;
    if (code === null) return;
    const boxes = [...code.querySelectorAll<HTMLElement>("[data-box]")];
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
    drawnRef.current = snippet.parts;
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
    const ids = new Set(snippet.parts.map((part) => part.id));
    const values = new Set(snippet.parts.map(valueKey));
    for (const part of drawn) {
      const [key, tokens] = !ids.has(part.id)
        ? [part.id, [...part.tokens, ...(part.value ?? [])]]
        : part.value !== undefined &&
            part.value.length > 0 &&
            !values.has(valueKey(part))
          ? [valueKey(part), part.value]
          : [undefined, []];
      const place = key === undefined ? undefined : before.get(key);
      if (place !== undefined) leave(ghosts, tokens, place);
    }
  }, [snippet]);

  // The places on record go stale when the code is laid out again without a
  // change of its own: the mono font arriving, or the viewport resizing.
  useLayoutEffect(() => {
    const code = codeRef.current;
    if (code === null) return;
    const observer = new ResizeObserver(() => {
      if (code.getAnimations({ subtree: true }).length > 0) return;
      placesRef.current = measure(code, [
        ...code.querySelectorAll<HTMLElement>("[data-box]"),
      ]);
    });
    observer.observe(code);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ViewTransition name="lab-snippet" default="lab-live">
      <div css={[corner.radius_2, styles.card]}>
        <div css={styles.head}>
          <Text as="span" look="caption" tone="subtle" css={labEyebrow.base}>
            {t({ en: "Usage", zh: "用法" })}
          </Text>
          <Button
            size="sm"
            look="ghost"
            icon={<CopyIcon />}
            aria-label={t({ en: "Copy code", zh: "复制代码" })}
            onClick={() => {
              void navigator.clipboard.writeText(snippet.text);
            }}
          />
        </div>
        <div
          tabIndex={0}
          css={[
            scrollX.base,
            scrollX.focusRing,
            scrollbar.autoHide,
            transition.scrollbarColor,
            styles.scroller,
          ]}
        >
          <pre css={styles.pre}>
            <code ref={codeRef} css={styles.code}>
              {snippet.parts.map((part) => (
                <Fragment key={part.id}>
                  {part.lead}
                  <span data-box={part.id} css={styles.box}>
                    {runs(part.tokens)}
                  </span>
                  {part.value !== undefined && part.value.length > 0 ? (
                    // Keyed by its text, so a change is the old value leaving
                    // and the new one arriving, the way a walkthrough marks an
                    // edit.
                    <span
                      key={textOf(part.value)}
                      data-box={valueKey(part)}
                      css={styles.box}
                    >
                      {runs(part.value)}
                    </span>
                  ) : null}
                </Fragment>
              ))}
              <span ref={ghostsRef} />
            </code>
          </pre>
        </div>
      </div>
    </ViewTransition>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
    inlineSize: "100%",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  scroller: {
    minInlineSize: 0,
    paddingBlockEnd: space._1,
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
  // A box that fragments across lines has no one place to measure, so each run
  // takes a box of its own.
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
