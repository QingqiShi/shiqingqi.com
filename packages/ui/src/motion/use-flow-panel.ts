import {
  use,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  EffectCarrierContext,
  scrollerOf,
} from "../effect-layer/effect-carrier-context.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import {
  CONTENT_HOLD,
  createFlowMotion,
  FLOW_SPRING,
  flowEngine,
  PANEL_HOLD,
  type FlowMotion,
} from "./create-flow-motion.ts";
import { cssTween } from "./css-tween.ts";
import { unit } from "./mix.ts";
import { useBinding } from "./use-binding.ts";
import { useMotionValue } from "./use-motion-engine.ts";

const REDUCED_FADE = cssTween(duration._150, easing.ease);

interface FlowPanelOptions {
  /** `motion` is `null` under reduced motion. */
  onAim?: (motion: FlowMotion | null, isOpen: boolean) => void;
  /** Comes once after each run of `onAim`, also when the panel unmounts. */
  onEnd?: () => void;
}

/**
 * The parent of the panel holds the trigger and has a `useFlowBlock`. Spread
 * `panel` on the panel, and put one box in it with `contentRef`.
 *
 * @internal
 */
export function useFlowPanel<Content extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  { onAim, onEnd }: FlowPanelOptions = {},
) {
  const [isShown, setIsShown] = useState(isOpen);
  if (isOpen && !isShown) setIsShown(true);

  const [engine] = useState(flowEngine);
  const progress = useMotionValue(engine, isOpen ? 1 : 0, {
    spring: FLOW_SPRING,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<Content>(null);
  const motionRef = useRef<FlowMotion | null>(null);
  const carrier = use(EffectCarrierContext);
  useBinding(panelRef, progress, {
    pose: (at) => ({ opacity: unit(at * 2).toFixed(3) }),
    reducedPose: (at) => ({ opacity: unit(at).toFixed(3) }),
    hold: PANEL_HOLD,
    rest: "clear",
  });
  useBinding(contentRef, progress, {
    pose: () => ({}),
    hold: CONTENT_HOLD,
    rest: "clear",
  });

  const isAimedRef = useRef(false);
  const report = useEffectEvent(
    (aim: { motion: FlowMotion | null; open: boolean } | null) => {
      if (aim !== null) {
        isAimedRef.current = true;
        onAim?.(aim.motion, aim.open);
      } else if (isAimedRef.current) {
        isAimedRef.current = false;
        onEnd?.();
      }
    },
  );

  const wasOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    if (wasOpenRef.current === isOpen) return;
    wasOpenRef.current = isOpen;
    const panel = panelRef.current;
    const content = contentRef.current;
    const root = panel?.parentElement;
    if (!panel || !content || !root) return;
    if (isOpen) panel.hidden = false;
    if (!engine.reducedMotion) {
      if (motionRef.current === null) {
        motionRef.current = createFlowMotion(
          {
            value: progress,
            root,
            panel,
            content,
            scroller:
              scrollerOf(carrier) ??
              document.scrollingElement ??
              document.documentElement,
          },
          isOpen,
        );
      }
      motionRef.current.aim(!isOpen);
    }
    report({ motion: motionRef.current, open: isOpen });
    void progress
      .to(isOpen ? 1 : 0, { reduced: REDUCED_FADE })
      .finished.then((landed) => {
        if (!landed) return;
        // A React update comes after the next paint, so this hides the panel.
        const rest = () => {
          motionRef.current?.end();
          motionRef.current = null;
          if (!isOpen) {
            panel.hidden = true;
            setIsShown(false);
          }
          report(null);
        };
        if (motionRef.current === null) rest();
        else motionRef.current.settle(rest);
      });
  }, [carrier, engine, isOpen, progress]);

  useEffect(
    () => () => {
      motionRef.current?.end();
      motionRef.current = null;
      progress.stop();
      report(null);
    },
    [progress],
  );

  return {
    panel: { ref: panelRef, hidden: !isShown, inert: !isOpen },
    contentRef,
    progress,
  };
}
