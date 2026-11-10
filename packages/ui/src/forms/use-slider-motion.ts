import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { EFFECT_DRAWN_ATTRIBUTE } from "../effect-layer/mark-effect-drawn.ts";
import { sliderLiquidRuns } from "../effect-layer/slider-liquid-runs.ts";
import { useSliderLiquid } from "../effect-layer/use-slider-liquid.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import {
  crossesText,
  edgeAt,
  fractionAtEdge,
  handleAt,
  labelPush,
  measureSlider,
  sliderLiquidView,
  sliderPose,
  travelOf,
  valueClimb,
  type SliderGeometry,
} from "./slider-pose.ts";
import {
  fractionOf,
  snapToStep,
  stepCount,
  stepOf,
  tickStride,
  type SliderRange,
} from "./snap-to-step.ts";

/** A tick is never closer than this to the next, in CSS px. */
const TICK_GAP = 12;
/** The room a tick, or the handle, keeps from the text in the groove, in CSS px. */
const TEXT_CLEARANCE = 6;
/** A pointer that moves less than this before it lets go is a tap, in CSS px. */
const TAP_SLOP = 3;
/**
 * Text moves out of the panel's way only when the move is this short, in
 * heights of the groove's inside. Longer, it stays and the panel crosses it.
 */
const SHORT_MOVE = 2;

interface Drag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startEdge: number;
  /** Screen px for each of the groove's own px. */
  readonly scale: number;
  moved: boolean;
}

/**
 * Where the ticks of the groove go, clear of its text, in px from the left
 * of its inside. The label is `labelShift` px from its place.
 */
function ticksOf(
  geometry: SliderGeometry | null,
  range: SliderRange,
  labelShift: number,
) {
  if (geometry === null) return [];
  const stride = tickStride(range, travelOf(geometry), TICK_GAP);
  if (stride === null) return [];
  const steps = stepCount(range);
  const size = stepOf(range);
  const clear = (
    x: number,
    span: readonly [number, number] | null,
    shift = 0,
  ) =>
    span === null ||
    x < span[0] + shift - TEXT_CLEARANCE ||
    x > span[1] + shift + TEXT_CLEARANCE;
  const ticks: number[] = [];
  for (let at = stride; at < steps; at += stride) {
    const x = handleAt(geometry, fractionOf(range.min + at * size, range));
    if (clear(x, geometry.label, labelShift) && clear(x, geometry.value)) {
      ticks.push(x);
    }
  }
  return ticks;
}

/**
 * The motion and the pointer of a Slider. One motion engine moves the
 * panel to the value on the spring, so each step of a drag lands with a
 * small bounce; moves the value onto the panel, or the label off it, when
 * the panel is solid and the move is short; opens the handle's line where
 * it crosses text; and melts the panel while a pointer holds it. The engine
 * writes all five on the
 * control, as `sliderPose` gives them, and the Slider liquid draws the
 * melted panel from the same values.
 *
 * A drag moves the panel's edge as far as the pointer moves, from anywhere
 * on the control, and a tap sends the edge to the point. `change` gets each
 * new value, and `commit` the end of each press.
 *
 * @internal
 */
export function useSliderMotion({
  value,
  range,
  labelHidden,
  disabled,
  change,
  commit,
}: {
  value: number;
  range: SliderRange;
  labelHidden: boolean;
  disabled: boolean;
  change: (next: number) => void;
  commit: () => void;
}) {
  const target = fractionOf(value, range);
  const controlRef = useRef<HTMLDivElement>(null);
  const grooveRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const topPieceRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const geometryRef = useRef<SliderGeometry | null>(null);
  const [geometry, setGeometry] = useState<SliderGeometry | null>(null);
  const [liquidDrawn, setLiquidDrawn] = useState(false);

  const engine = useMotionEngine();
  const fraction = useMotionValue(engine, target, { precision: 1e-4 });
  const climb = useMotionValue(engine, 0);
  const push = useMotionValue(engine, 0);
  const split = useMotionValue(engine, 0);
  const melt = useMotionValue(engine, 0);
  useBinding(controlRef, [fraction, climb, push, split, melt], {
    pose: (f, c, p, s, m) => sliderPose(geometryRef.current, f, c, p, s, m),
    // The liquid reads the same values on the frames of the effect layer.
    renderer: "frame",
  });
  const registerLiquid = useSliderLiquid();

  useLayoutEffect(() => {
    const groove = grooveRef.current;
    const inner = innerRef.current;
    const topPiece = topPieceRef.current;
    const valueElement = valueRef.current;
    const panel = panelRef.current;
    if (
      groove === null ||
      inner === null ||
      topPiece === null ||
      valueElement === null ||
      panel === null
    ) {
      return;
    }
    const label = labelRef.current;
    const update = () => {
      const next = measureSlider({
        groove,
        inner,
        topPiece,
        label,
        value: valueElement,
        panel,
      });
      geometryRef.current = next;
      setGeometry(next);
      // A set stops a motion, so only a panel at rest needs the pose
      // written again for the new geometry: a moving one writes it each frame.
      if (fraction.get() === fraction.target) fraction.set(fraction.target);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(inner);
    observer.observe(valueElement);
    if (label !== null) observer.observe(label);
    return () => {
      observer.disconnect();
    };
  }, [fraction, labelHidden]);

  useEffect(() => {
    const groove = grooveRef.current;
    if (groove === null) return;
    const observer = new MutationObserver(() => {
      setLiquidDrawn(groove.hasAttribute(EFFECT_DRAWN_ATTRIBUTE));
    });
    observer.observe(groove, { attributeFilter: [EFFECT_DRAWN_ATTRIBUTE] });
    return () => {
      observer.disconnect();
      sliderLiquidRuns.delete(groove);
    };
  }, []);

  useLayoutEffect(() => {
    if (fraction.target !== target) fraction.to(target);
  }, [fraction, target]);

  // A text moves out of the panel's way once the panel is solid, if the
  // move is short: the value onto the panel, beside the handle, and the
  // label off it, into the groove beside the handle. While the liquid shows
  // them through, both go back to their places.
  const shortMove = geometry === null ? 0 : SHORT_MOVE * geometry.inner[3];
  const covered =
    geometry !== null &&
    edgeAt(geometry, target) > geometry.value[0] - TEXT_CLEARANCE / 2;
  const climbed =
    covered && valueClimb(geometry, target) <= shortMove && !liquidDrawn;
  const pushBy = geometry === null ? 0 : labelPush(geometry, target);
  const pushed =
    geometry?.label != null &&
    pushBy > 0 &&
    pushBy <= shortMove &&
    geometry.label[1] + pushBy <= geometry.value[0] - geometry.beside &&
    !liquidDrawn;
  const placedRef = useRef(false);
  useLayoutEffect(() => {
    if (geometry === null) return;
    const goals = [
      [climb, climbed ? 1 : 0],
      [push, pushed ? 1 : 0],
    ] as const;
    for (const [motion, goal] of goals) {
      if (!placedRef.current) motion.set(goal);
      else if (motion.target !== goal) motion.to(goal);
    }
    placedRef.current = true;
  }, [climb, climbed, push, pushed, geometry]);

  useEffect(() => {
    const update = () => {
      const current = geometryRef.current;
      if (current === null) return;
      const open = crossesText(
        current,
        fraction.get(),
        { climb: climb.get(), push: push.get() },
        TEXT_CLEARANCE,
      );
      const goal = open ? 1 : 0;
      if (split.target !== goal) split.to(goal);
    };
    update();
    const stopFraction = fraction.subscribe(update);
    const stopClimb = climb.subscribe(update);
    const stopPush = push.subscribe(update);
    return () => {
      stopFraction();
      stopClimb();
      stopPush();
    };
  }, [fraction, climb, push, split, geometry]);

  function meltPanel(current: SliderGeometry) {
    const groove = grooveRef.current;
    if (groove === null || engine.reducedMotion) return;
    sliderLiquidRuns.set(groove, () =>
      sliderLiquidView(
        geometryRef.current ?? current,
        fraction.get(),
        fraction.getVelocity(),
        split.get(),
        melt.get(),
      ),
    );
    melt.to(1);
  }

  function setPanel() {
    const groove = grooveRef.current;
    if (groove === null || melt.target === 0) return;
    melt.to(0);
    // The spring goes past 0 and back before it stops. The liquid must not
    // show again on that bounce, so it stops the first time the melt is 0.
    const stop = melt.subscribe((value) => {
      if (melt.target !== 0) {
        stop();
      } else if (value <= 0) {
        stop();
        sliderLiquidRuns.delete(groove);
      }
    });
  }

  function valueAtEdge(current: SliderGeometry, edge: number) {
    const { min, max } = range;
    return snapToStep(min + fractionAtEdge(current, edge) * (max - min), range);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>, tap: boolean) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const inner = innerRef.current;
    const current = geometryRef.current;
    if (tap && !drag.moved && inner !== null && current !== null) {
      const box = inner.getBoundingClientRect();
      change(valueAtEdge(current, (event.clientX - box.left) / drag.scale));
    }
    commit();
    setPanel();
  }

  return {
    ticks: ticksOf(geometry, range, pushed ? pushBy : 0),
    controlRef,
    grooveRef: (element: HTMLDivElement | null) => {
      grooveRef.current = element;
      return registerLiquid(element);
    },
    innerRef,
    topPieceRef,
    labelRef,
    valueRef,
    panelRef,
    inputRef,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        const inner = innerRef.current;
        const current = geometryRef.current;
        if (
          disabled ||
          event.button !== 0 ||
          inner === null ||
          current === null
        ) {
          return;
        }
        event.preventDefault();
        inputRef.current?.focus({ preventScroll: true, focusVisible: false });
        event.currentTarget.setPointerCapture(event.pointerId);
        const box = inner.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startEdge: edgeAt(current, target),
          scale: inner.offsetWidth > 0 ? box.width / inner.offsetWidth : 1,
          moved: false,
        };
        meltPanel(current);
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        const current = geometryRef.current;
        if (drag?.pointerId !== event.pointerId || current === null) return;
        const moved = (event.clientX - drag.startX) / drag.scale;
        if (!drag.moved && Math.abs(moved) < TAP_SLOP) return;
        drag.moved = true;
        change(valueAtEdge(current, drag.startEdge + moved));
      },
      onPointerUp(event: PointerEvent<HTMLDivElement>) {
        endDrag(event, true);
      },
      onPointerCancel(event: PointerEvent<HTMLDivElement>) {
        endDrag(event, false);
      },
      onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
        endDrag(event, false);
      },
    },
  };
}
