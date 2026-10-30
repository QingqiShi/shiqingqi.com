"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { useDust } from "@tuja/ui/hooks/use-dust";
import { useExtractorFan } from "@tuja/ui/hooks/use-extractor-fan";
import { usePrepareEffects } from "@tuja/ui/hooks/use-prepare-effects";
import { useRingLight } from "@tuja/ui/hooks/use-ring-light";
import { prefersReducedMotion } from "@tuja/ui/motion/prefers-reduced-motion";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { springScrollTo } from "./spring-scroll-to.ts";

/** One dust particle for each length of a card's edge, in px. */
const BURST_SPACING = 10;
/** How long the mark pulls the dust in once the page is near, in ms. */
const PULL_MS = 1800;

/** The section the visitor last came to through a link, and how many times they came. */
interface Arrival {
  id: string;
  count: number;
}

/** The dust of one press, on its way from a card to the section `id`. */
interface Flight extends Arrival {
  /**
   * How far the section's mark pulls the dust in: 0 until the page is near,
   * and then across the whole screen.
   */
  reach: number;
}

interface PrincipleAnchorsState {
  /** Under reduced motion, the last arrival. */
  arrival: Arrival | null;
  flight: Flight | null;
  goTo: (id: string, card: Element) => void;
}

/** The box of the card that press `count` shakes dust off, on the screen. */
interface Burst {
  count: number;
  card: DOMRect;
}

const PrincipleAnchorsContext = createContext<PrincipleAnchorsState | null>(
  null,
);

function usePrincipleAnchors() {
  const state = use(PrincipleAnchorsContext);
  if (state === null) {
    throw new Error("A principle anchor must be inside PrincipleAnchors.");
  }
  return state;
}

/**
 * Holds the links to the principle sections and the marks in their titles.
 * A press on a link shakes dust off its card, which stays on the screen while
 * the page springs to the section, and the section's mark pulls the dust in
 * as the page gets there. Under reduced motion, the page jumps and the mark
 * lights up.
 */
export function PrincipleAnchors({ children }: { children: ReactNode }) {
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const flightTimerRef = useRef<number | undefined>(undefined);
  const pressCountRef = useRef(0);
  usePrepareEffects(["dust"]);

  useEffect(
    () => () => {
      stopRef.current?.();
      window.clearTimeout(flightTimerRef.current);
    },
    [],
  );

  const goTo = (id: string, card: Element) => {
    const section = document.getElementById(id);
    if (section === null) return;
    stopRef.current?.();
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `#${id}`);
    }
    section.focus({ preventScroll: true });
    pressCountRef.current += 1;
    const count = pressCountRef.current;
    const reduced = prefersReducedMotion();
    const endFlight = () => {
      setFlight((last) => (last?.count === count ? null : last));
      setBurst((last) => (last?.count === count ? null : last));
    };
    if (!reduced) {
      setFlight({ id, count, reach: 0 });
      setBurst({ count, card: card.getBoundingClientRect() });
    }
    const onNear = reduced
      ? undefined
      : () => {
          const reach = Math.hypot(window.innerWidth, window.innerHeight);
          setFlight((last) =>
            last?.count === count ? { ...last, reach } : last,
          );
          window.clearTimeout(flightTimerRef.current);
          flightTimerRef.current = window.setTimeout(endFlight, PULL_MS);
        };
    const { finished, stop } = springScrollTo(section, onNear);
    stopRef.current = stop;
    void finished.then((isThere) => {
      if (stopRef.current === stop) stopRef.current = null;
      if (!isThere) endFlight();
      if (isThere && reduced) setArrival({ id, count });
    });
  };

  return (
    <PrincipleAnchorsContext value={{ arrival, flight, goTo }}>
      {children}
      {burst === null
        ? null
        : createPortal(
            <EffectCarrier value="viewport">
              <CardDust
                key={burst.count}
                box={burst.card}
                onShed={() => {
                  setBurst((last) => (last === burst ? null : last));
                }}
              />
            </EffectCarrier>,
            document.body,
          )}
    </PrincipleAnchorsContext>
  );
}

/**
 * A clear box over a pressed card that shakes dust off the card's edge once,
 * and goes as soon as it has. The box is on the viewport, so its dust stays
 * on the screen while the page springs away, and takes the accent from its
 * `color`.
 */
function CardDust({ box, onShed }: { box: DOMRect; onShed: () => void }) {
  const ref = useDust({
    density: 0,
    colorFrom: "text",
    burst: Math.round((2 * (box.width + box.height)) / BURST_SPACING),
    onShed,
  });
  return (
    <span
      ref={ref}
      aria-hidden
      css={[
        corner.radius_3,
        styles.cardDust,
        styles.screenBox(box.x, box.y, box.width, box.height),
      ]}
    />
  );
}

/** A card that links to the section `id` of the page. */
export function PrincipleLink({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { goTo } = usePrincipleAnchors();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;
    if (opensElsewhere) return;
    event.preventDefault();
    goTo(id, event.currentTarget);
  };

  return (
    <a
      href={`#${id}`}
      onClick={onClick}
      css={[stack.item, cardSurface.base, cardSurface.interactive, styles.card]}
    >
      {children}
    </a>
  );
}

/**
 * The icon in the title of the section `id`. It pulls in the dust of a press
 * on the section's link each time the visitor arrives through the link, and
 * under reduced motion a Ring light runs once round it instead.
 */
export function PrincipleMark({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { arrival, flight } = usePrincipleAnchors();
  return (
    <span css={styles.mark}>
      {children}
      {flight?.id === id ? (
        <ArrivalFan key={flight.count} reach={flight.reach} />
      ) : null}
      {arrival?.id === id ? <ArrivalLight key={arrival.count} /> : null}
    </span>
  );
}

function ArrivalFan({ reach }: { reach: number }) {
  const ref = useExtractorFan({ reach });
  return <span ref={ref} aria-hidden css={styles.fan} />;
}

function ArrivalLight() {
  const ref = useRingLight();
  return (
    <span ref={ref} aria-hidden css={[corner.radius_round, styles.light]} />
  );
}

const styles = stylex.create({
  card: {
    boxSizing: "border-box",
    blockSize: "100%",
    padding: space._5,
    color: "inherit",
    textDecoration: "none",
    backgroundColor: {
      default: color.bgSurface,
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
      ":active": {
        default: color.bgControlHover,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    transform: {
      default: null,
      ":active": {
        default: "scale(0.98)",
        [motionConstants.REDUCED_MOTION]: null,
      },
    },
    transition: {
      default: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}, transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}`,
    },
  },
  mark: {
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
    color: color.fg,
  },
  cardDust: {
    position: "fixed",
    color: color.bgAccent,
    pointerEvents: "none",
  },
  screenBox: (x: number, y: number, width: number, height: number) => ({
    insetInlineStart: x,
    insetBlockStart: y,
    inlineSize: width,
    blockSize: height,
  }),
  fan: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  light: {
    position: "absolute",
    inset: `calc(-1 * ${space._0})`,
    color: color.bgAccent,
    pointerEvents: "none",
  },
});
