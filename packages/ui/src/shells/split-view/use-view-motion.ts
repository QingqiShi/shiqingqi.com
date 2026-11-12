import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createPendingSnapshot,
  type PendingSnapshot,
} from "../../motion/create-pending-snapshot.ts";
import { useMotionEngine } from "../../motion/use-motion-engine.ts";
import {
  createPageScroll,
  STACK_ROOT_KEY,
  type PageScroll,
} from "../create-page-scroll.ts";
import {
  createSplitViewMotion,
  type SplitViewMotion,
} from "../create-split-view-motion.ts";
import type { LeavingCopy } from "../leaving-copy-taker.tsx";
import { normalizeUrl } from "../normalize-url.ts";
import type {
  SplitViewChange,
  SplitViewMarks,
  SplitViewSnapshot,
} from "../split-view-motion/types.ts";

/**
 * Calls `onStep` with the URL that Back or Forward of the browser goes to,
 * before the router changes the DOM. Gives the cleanup.
 */
function onHistoryStep(onStep: (to: string) => void) {
  // React commits the router's transition of a popstate event before the
  // next popstate listener runs. The navigate event comes before popstate.
  const navigation = "navigation" in window ? window.navigation : null;
  if (navigation !== null) {
    const onNavigate = (event: NavigateEvent) => {
      if (event.navigationType === "traverse") onStep(event.destination.url);
    };
    navigation.addEventListener("navigate", onNavigate);
    return () => {
      navigation.removeEventListener("navigate", onNavigate);
    };
  }
  const onPopState = () => {
    onStep(window.location.href);
  };
  window.addEventListener("popstate", onPopState, { capture: true });
  return () => {
    window.removeEventListener("popstate", onPopState, { capture: true });
  };
}

/** @internal */
export function useViewMotion({
  view,
  layer,
  marks,
  motion,
  setSettled,
  showsStackRoot,
  contentKey,
  isRouted,
  opensContent,
  opensStackRoot,
  tabOpening,
}: {
  view: HTMLElement | null;
  layer: HTMLElement | null;
  marks: SplitViewMarks;
  motion: { id: number; change: SplitViewChange };
  setSettled: Dispatch<SetStateAction<number>>;
  showsStackRoot: boolean;
  contentKey: string | null | undefined;
  isRouted: boolean;
  opensContent: boolean;
  opensStackRoot: boolean;
  tabOpening: string | null;
}) {
  const engine = useMotionEngine();
  const motionRef = useRef<SplitViewMotion | null>(null);
  // Where the Shared elements show before a navigation of the view, for the
  // motion that the navigation brings. Until that motion, it is read again
  // at each frame, scroll and commit, as the data can come much later.
  const pendingRef = useRef<PendingSnapshot<SplitViewSnapshot> | null>(null);
  const pageScrollRef = useRef<PageScroll | null>(null);
  const leavingCopyRef = useRef<LeavingCopy | null>(null);
  const capture = (to: string, isHistoryStep = false) => {
    pageScrollRef.current?.remember(isHistoryStep);
    pendingRef.current?.take(normalizeUrl(to));
  };
  const recapture = useEffectEvent(() => {
    pendingRef.current?.refresh();
  });
  useLayoutEffect(() => {
    if (view === null || layer === null) return;
    const created = createSplitViewMotion(engine, view, layer, marks, {
      onSettled: (id) => {
        setSettled((current) => Math.max(current, id));
      },
      onFrame: () => {
        recapture();
      },
    });
    motionRef.current = created;
    pendingRef.current = createPendingSnapshot(() => created.capture());
    return () => {
      created.destroy();
      motionRef.current = null;
      pendingRef.current = null;
    };
  }, [engine, view, layer, marks, setSettled]);

  const shownKey = useEffectEvent(() =>
    showsStackRoot ? STACK_ROOT_KEY : (contentKey ?? ""),
  );
  const opensOtherTab = tabOpening !== null;
  const isOpening = opensContent || opensStackRoot || opensOtherTab;
  const isOpeningNow = useEffectEvent(() => isOpening);
  const [pageScrolls, setPageScrolls] = useState(false);
  useLayoutEffect(() => {
    if (view === null) return;
    const created = createPageScroll(
      view,
      shownKey(),
      setPageScrolls,
      isRouted,
      isOpeningNow(),
    );
    pageScrollRef.current = created;
    return () => {
      created.destroy();
      pageScrollRef.current = null;
    };
  }, [view, isRouted]);
  useLayoutEffect(() => {
    if (opensOtherTab) pageScrollRef.current?.hold();
  }, [opensOtherTab]);
  useLayoutEffect(() => {
    pageScrollRef.current?.setNavigating(isOpening);
  }, [isOpening]);

  useLayoutEffect(() => {
    if (motion.id === 0) return;
    // The page scrolls before the motion measures where the pages show.
    pageScrollRef.current?.follow(shownKey(), motion.change.content);
    const created = motionRef.current;
    if (created === null) return;
    const here = normalizeUrl(window.location.href);
    const snapshot = pendingRef.current?.claim(here, true) ?? null;
    created.play(snapshot, motion.change, motion.id);
  }, [motion]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pending.claim(normalizeUrl(window.location.href), false);
    pending.refresh();
  });

  const captureHistoryStep = useEffectEvent((to: string) => {
    capture(to, true);
  });
  useEffect(() => {
    if (view === null) return;
    const onScroll = () => {
      recapture();
    };
    view.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const stopHistorySteps = onHistoryStep(captureHistoryStep);
    return () => {
      view.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scroll", onScroll);
      stopHistorySteps();
    };
  }, [view]);

  return {
    motionRef,
    pageScrollRef,
    leavingCopyRef,
    capture,
    pageScrolls,
  };
}
