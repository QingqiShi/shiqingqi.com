"use client";

import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "@tuja/ui/primitives/motion.stylex";
import { pageColumnTokens } from "@tuja/ui/primitives/page-column.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLinkStatus } from "#src/links/link.tsx";
import {
  FINANCE_DESTINATION_PATHS,
  isCurrentDestination,
} from "./finance-destination-paths.ts";
import { FinanceScreenSkeleton } from "./finance-screen-skeleton.tsx";

interface PendingScreen {
  /** The locale-free path of the screen that a link opens while the server renders it. */
  path: string | null;
  setPath: Dispatch<SetStateAction<string | null>>;
}

const PendingScreenContext = createContext<PendingScreen>({
  path: null,
  setPath: () => {},
});

/** Holds the screen that a Finance destination link opens. Put it around the rail, the tab bar and `FinanceScreenSlot`. */
export function PendingScreenProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string | null>(null);
  return (
    <PendingScreenContext value={{ path, setPath }}>
      {children}
    </PendingScreenContext>
  );
}

/**
 * Put it inside the link of a Finance destination. While Next.js waits for
 * the server to render the screen, it marks that screen as the one that
 * opens, so the content area shows a skeleton at once.
 */
export function PendingScreenMarker({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const { setPath } = use(PendingScreenContext);
  const path = normalizePath(href);
  useLayoutEffect(() => {
    if (pending) {
      setPath(path);
    } else {
      setPath((current) => (current === path ? null : current));
    }
  }, [pending, path, setPath]);
  return null;
}

/** The locale-free path of the screen that shows or opens now. */
export function useShownFinancePath() {
  const current = normalizePath(usePathname());
  return use(PendingScreenContext).path ?? current;
}

/** The skeleton of the screen that shows or opens now. */
export function ShownScreenSkeleton() {
  return <FinanceScreenSkeleton path={useShownFinancePath()} />;
}

/**
 * How long a switch waits for the new screen before the skeleton shows. A
 * screen that the router holds renders in less time, so it shows no skeleton.
 */
const SKELETON_DELAY_MS = 100;

const NET_WORTH_PATH = "/finance";

/**
 * The content area of Finance. Net worth takes the full width beside the
 * rail; every other screen is centred at the width of the page column. A switch
 * to another destination makes the new screen rise into place. While the
 * server renders the new screen, a skeleton shows in its place, and the
 * screen fades in over it.
 */
export function FinanceScreenSlot({ children }: { children: ReactNode }) {
  const current = normalizePath(usePathname());
  const pending = use(PendingScreenContext).path;
  const waiting = pending !== null && pending !== current;
  const [slowPath, setSlowPath] = useState<string | null>(null);
  if (!waiting && slowPath !== null) setSlowPath(null);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setSlowPath(pending);
    }, SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [waiting, pending]);
  const skeletonPath = waiting && slowPath === pending ? pending : null;
  const shownPath = skeletonPath ?? current;

  const destination = FINANCE_DESTINATION_PATHS.findIndex((path) =>
    isCurrentDestination(shownPath, path),
  );
  const [entry, setEntry] = useState({ destination, count: 0 });
  if (destination !== entry.destination) {
    setEntry({ destination, count: entry.count + 1 });
  }
  const skeleton = skeletonPath !== null;
  const [hadSkeleton, setHadSkeleton] = useState(skeleton);
  const [revealing, setRevealing] = useState(false);
  if (skeleton !== hadSkeleton) {
    setHadSkeleton(skeleton);
    setRevealing(!skeleton);
  }
  useLayoutEffect(() => {
    if (skeleton) window.scrollTo(0, 0);
  }, [skeleton]);

  return (
    <div
      css={[
        shownPath !== NET_WORTH_PATH && styles.pageColumnWidth,
        entry.count > 0 && [
          styles.enter,
          entry.count % 2 === 1 ? styles.riseOdd : styles.riseEven,
        ],
      ]}
    >
      {skeletonPath !== null ? (
        <FinanceScreenSkeleton path={skeletonPath} />
      ) : null}
      <div
        css={[skeleton && styles.hidden, revealing && styles.reveal]}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setRevealing(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Two keyframes with the same frames: the name must change to start the
// animation again on the next switch.
const riseOdd = stylex.keyframes({
  from: { opacity: 0, transform: `translateY(${space._7})` },
});
const riseEven = stylex.keyframes({
  from: { opacity: 0, transform: `translateY(${space._7})` },
});

const styles = stylex.create({
  pageColumnWidth: {
    maxInlineSize: pageColumnTokens.inlineSize,
    marginInline: "auto",
  },
  enter: {
    animationDuration: duration._500,
    animationTimingFunction: {
      default: easing.springFallback,
      "@supports (animation-timing-function: linear(0, 1))": easing.spring,
    },
  },
  riseOdd: {
    animationName: {
      default: riseOdd,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  riseEven: {
    animationName: {
      default: riseEven,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  reveal: {
    animationName: motionKeyframes.fadeIn,
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  hidden: {
    display: "none",
  },
});
