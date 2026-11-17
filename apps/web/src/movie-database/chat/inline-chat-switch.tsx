"use client";

import * as stylex from "@stylexjs/stylex";
import { bind, type Binding } from "@tuja/ui/motion/bind";
import { cssTween } from "@tuja/ui/motion/css-tween";
import { mix, unit } from "@tuja/ui/motion/mix";
import type { Rect } from "@tuja/ui/motion/play-layout";
import { px } from "@tuja/ui/motion/px";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";
import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";
import { duration, easing } from "@tuja/ui/primitives/motion.stylex";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  screenScrollerOf,
  scrollEventTargetOf,
} from "#src/movie-database/screen-scroller-of.ts";
import { DotGridBackground } from "./dot-grid-background.tsx";
import { DATA_INLINE_CHAT_INPUT, useInlineChat } from "./inline-chat-context";

const RISE_SPRING = springOf(springRoles.surface);
const FLIGHT_SPRING = springOf(springRoles.flight);
const REDUCED_FADE = cssTween(duration._150, easing.ease);
/** How far below its place, in px, a side starts as it comes and ends as it leaves. */
const RISE = 24;

/** The chat input in `side` and its box, or `null` when it has none. */
function inputBoxIn(side: HTMLElement) {
  const element = side.querySelector<HTMLElement>(
    `[${DATA_INLINE_CHAT_INPUT}]`,
  );
  if (element === null) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  if (width === 0 || height === 0) return null;
  const box: Rect = { x: left, y: top, width, height };
  return { element, box };
}

function isOnScreen(box: Rect, scroller: HTMLElement) {
  const { top, bottom } =
    scroller === document.documentElement
      ? { top: 0, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();
  return box.y + box.height > top && box.y < bottom;
}

interface InlineChatSwitchProps {
  browseContent: ReactNode;
  chatContent: ReactNode;
}

/**
 * Shows the list or the open chat. On a swap, the side that leaves stays on
 * the page, out of the layout, until it is out of sight, and the chat input
 * flies between its place in the hero and its place in the chat. A swap
 * during a swap turns each part from where it is.
 */
export function InlineChatSwitch({
  browseContent,
  chatContent,
}: InlineChatSwitchProps) {
  const { isChatActive, leaving, finishSwap } = useInlineChat();
  const engine = useMotionEngine();
  // Each value is 0 for the list and 1 for the chat.
  const shown = isChatActive ? 1 : 0;
  const rise = useMotionValue(engine, shown, { spring: RISE_SPRING });
  const flight = useMotionValue(engine, shown, { spring: FLIGHT_SPRING });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const browseRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const scrollBeforeRef = useRef(0);
  const browseScrollRef = useRef(0);

  const finish = useEffectEvent(finishSwap);

  // The scroll of the screen as its last scroll event gave it. The way back
  // of the screen puts the scroll at the top before it closes the chat, and
  // that event comes after the swap, so this is where the visitor was.
  useEffect(() => {
    const scroller = screenScrollerOf(containerRef.current);
    const target = scrollEventTargetOf(scroller);
    const read = () => {
      scrollBeforeRef.current = scroller.scrollTop;
    };
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => {
      target.removeEventListener("scroll", read);
    };
  }, []);

  useLayoutEffect(() => {
    const browse = browseRef.current;
    const chat = chatRef.current;
    if (leaving === null || browse === null || chat === null) return;

    // The list comes back where the visitor left it. The side that leaves
    // is out of the layout now, so it takes the change of the scroll as an
    // offset and stays where it showed.
    const scroller = screenScrollerOf(containerRef.current);
    if (isChatActive) {
      browseScrollRef.current = scrollBeforeRef.current;
    } else {
      scroller.scrollTo({ top: browseScrollRef.current, behavior: "instant" });
    }
    const shift = scroller.scrollTop - scrollBeforeRef.current;
    const leaver = leaving === "browse" ? browse : chat;
    leaver.style.setProperty("position", "relative");
    leaver.style.setProperty("top", px(shift));

    // Each side binds the two values, so that it keeps its pose until the
    // input lands too.
    const bindings = [
      bind(browse, [rise, flight], {
        rest: "clear",
        pose: (t) => ({
          translate: `0 ${px(RISE * t)}`,
          opacity: (1 - unit(t)).toFixed(3),
        }),
        reducedPose: (t) => ({ opacity: (1 - unit(t)).toFixed(3) }),
      }),
      bind(chat, [rise, flight], {
        rest: "clear",
        pose: (t) => ({
          translate: `0 ${px(RISE * (1 - t))}`,
          opacity: unit(t).toFixed(3),
        }),
        reducedPose: (t) => ({ opacity: unit(t).toFixed(3) }),
      }),
    ];
    const background = backgroundRef.current;
    if (background !== null) {
      const atRest = Number(getComputedStyle(background).opacity);
      bindings.push(
        bind(background, [rise, flight], {
          rest: "clear",
          pose: (t) => ({ opacity: (atRest * unit(t)).toFixed(3) }),
        }),
      );
    }

    // The chat can change its layout while the input flies, such as when
    // the first message replaces the empty state, so the flight reads the
    // two boxes again at each such change.
    let flightBindings: Binding[] = [];
    const planFlight = () => {
      for (const binding of flightBindings) binding.unbind();
      flightBindings = [];
      if (engine.reducedMotion) return;
      const [heroInput, chatInput] = engine.measure(() => [
        inputBoxIn(browse),
        inputBoxIn(chat),
      ]);
      if (
        heroInput === null ||
        chatInput === null ||
        !isOnScreen(heroInput.box, scroller)
      ) {
        return;
      }
      const from = heroInput.box;
      const to = chatInput.box;
      // Each form of the input moves and stretches with the one box. Its
      // side rises too, so the pose takes that rise off.
      const poseOf =
        (own: Rect, riseOf: (t: number) => number) =>
        (at: number, risen: number) => ({
          transform: `translate(${px(mix(from.x, to.x, at) - own.x)}, ${px(mix(from.y, to.y, at) - own.y - riseOf(risen))}) scale(${(mix(from.width, to.width, at) / own.width).toFixed(4)}, ${(mix(from.height, to.height, at) / own.height).toFixed(4)})`,
        });
      const hold = { "transform-origin": "0 0" };
      flightBindings = [
        bind(heroInput.element, [flight, rise], {
          pose: poseOf(from, (t) => RISE * t),
          hold,
          rest: "clear",
        }),
        bind(chatInput.element, [flight, rise], {
          pose: poseOf(to, (t) => RISE * (1 - t)),
          hold,
          rest: "clear",
        }),
      ];
    };
    const observer = new ResizeObserver(planFlight);
    observer.observe(browse);
    observer.observe(chat);

    const target = isChatActive ? 1 : 0;
    void Promise.all([
      rise.to(target, { reduced: REDUCED_FADE }).finished,
      flight.to(target, { reduced: REDUCED_FADE }).finished,
    ]).then(([hasRisen, hasFlown]) => {
      if (hasRisen && hasFlown) finish();
    });
    return () => {
      observer.disconnect();
      for (const binding of [...bindings, ...flightBindings]) binding.unbind();
      leaver.style.removeProperty("position");
      leaver.style.removeProperty("top");
    };
  }, [engine, rise, flight, isChatActive, leaving]);

  const showsBrowse = !isChatActive || leaving === "browse";
  const showsChat = isChatActive || leaving === "chat";
  return (
    <div ref={containerRef} css={styles.container}>
      {showsChat ? <DotGridBackground ref={backgroundRef} /> : null}
      {showsBrowse ? (
        <div
          key="browse"
          css={leaving === "browse" && styles.leaving}
          inert={leaving === "browse" || undefined}
          aria-hidden={leaving === "browse" || undefined}
        >
          <div ref={browseRef}>{browseContent}</div>
        </div>
      ) : null}
      {showsChat ? (
        <div
          key="chat"
          css={leaving === "chat" && styles.leaving}
          inert={leaving === "chat" || undefined}
          aria-hidden={leaving === "chat" || undefined}
        >
          <div ref={chatRef}>{chatContent}</div>
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
  },
  leaving: {
    position: "absolute",
    inset: 0,
    overflow: "clip",
    pointerEvents: "none",
  },
});
