"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { useRingLight } from "@tuja/ui/hooks/use-ring-light";
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
import { springScrollTo } from "./spring-scroll-to.ts";

/** The section the visitor last came to through a link, and how many times they came. */
interface Arrival {
  id: string;
  count: number;
}

interface PrincipleAnchorsState {
  arrival: Arrival | null;
  goTo: (id: string) => void;
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
 * A link springs the page to its section, and the section's mark lights up
 * when the page comes to rest there.
 */
export function PrincipleAnchors({ children }: { children: ReactNode }) {
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  const goTo = (id: string) => {
    const section = document.getElementById(id);
    if (section === null) return;
    stopRef.current?.();
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `#${id}`);
    }
    section.focus({ preventScroll: true });
    const { finished, stop } = springScrollTo(section);
    stopRef.current = stop;
    void finished.then((isThere) => {
      if (stopRef.current === stop) stopRef.current = null;
      if (isThere) {
        setArrival((last) => ({ id, count: (last?.count ?? 0) + 1 }));
      }
    });
  };

  return (
    <PrincipleAnchorsContext value={{ arrival, goTo }}>
      {children}
    </PrincipleAnchorsContext>
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
    goTo(id);
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
 * The icon in the title of the section `id`. A Ring light runs once round it
 * each time the visitor arrives at the section through a link.
 */
export function PrincipleMark({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { arrival } = usePrincipleAnchors();
  return (
    <span css={styles.mark}>
      {children}
      {arrival?.id === id ? <ArrivalLight key={arrival.count} /> : null}
    </span>
  );
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
  light: {
    position: "absolute",
    inset: `calc(-1 * ${space._0})`,
    color: color.bgAccent,
    pointerEvents: "none",
  },
});
