"use client";

import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionKeyframes,
} from "@tuja/ui/primitives/motion.stylex";
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
  /** The locale-free path of the screen whose skeleton shows, if one does. */
  skeletonPath: string | null;
}

const PendingScreenContext = createContext<PendingScreen>({
  path: null,
  setPath: () => {},
  skeletonPath: null,
});

/**
 * How long a switch waits for the new screen before the skeleton shows. A
 * screen that the router holds renders in less time, so it shows no skeleton.
 */
const SKELETON_DELAY_MS = 100;

/** Holds the screen that a Finance destination link opens. Put it around the rail, the tab bar and `FinanceScreenSlot`. */
export function PendingScreenProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string | null>(null);
  const current = normalizePath(usePathname());
  const waiting = path !== null && path !== current;
  const [slowPath, setSlowPath] = useState<string | null>(null);
  if (!waiting && slowPath !== null) setSlowPath(null);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setSlowPath(path);
    }, SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [waiting, path]);
  const skeletonPath = waiting && slowPath === path ? path : null;
  return (
    <PendingScreenContext value={{ path, setPath, skeletonPath }}>
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
 * The index of the Finance destination whose screen, or whose skeleton,
 * shows now. It changes when the new screen shows, not when its link is
 * clicked.
 */
export function useShownDestination() {
  const current = normalizePath(usePathname());
  const shownPath = use(PendingScreenContext).skeletonPath ?? current;
  return FINANCE_DESTINATION_PATHS.findIndex((path) =>
    isCurrentDestination(shownPath, path),
  );
}

/**
 * The content area of Finance. Each screen lays itself out: in columns, as
 * a `NavigationSplitView`, or in a `FinancePageColumn`. While the server
 * renders the new screen, a skeleton shows in its place, and the screen
 * fades in over it.
 */
export function FinanceScreenSlot({ children }: { children: ReactNode }) {
  const { skeletonPath } = use(PendingScreenContext);
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
    <>
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
    </>
  );
}

const styles = stylex.create({
  reveal: {
    animationName: motionKeyframes.fadeIn,
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  hidden: {
    display: "none",
  },
});
