"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { unit } from "@tuja/ui/motion/mix";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";
import { useBinding } from "@tuja/ui/motion/use-binding";
import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const PUCK = "2.5rem";
/** A pointer must move this far, in px, before a press becomes a drag. */
const DRAG_SLOP = 4;
/** How far ahead, in seconds, a release looks to pick its end. */
const PROJECTION = 0.2;
/** The drag speed is read over this last stretch of time, in ms. */
const VELOCITY_WINDOW = 80;

/**
 * A puck on a track, on the public motion API only. A tap sends it to the
 * other end, a tap during the motion turns it from where it is at its speed,
 * and a drag flings it with the speed of the release.
 */
export function MotionEngineSpecimen() {
  const reduced = useReducedMotion();
  const [role, setRole] = useState<"surface" | "move" | "aim">("move");
  const engine = useMotionEngine();
  const progress = useMotionValue(engine, 0);
  const laneRef = useRef<HTMLSpanElement>(null);
  const puckRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<HTMLSpanElement>(null);
  const velocityRef = useRef<HTMLSpanElement>(null);
  const draggedRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startValue: number;
    travel: number;
    isDragging: boolean;
    moves: { time: number; x: number }[];
  } | null>(null);

  useBinding(puckRef, progress, {
    pose: (at) => ({
      transform: `translateX(calc((100cqi - ${PUCK}) * ${at.toFixed(4)}))`,
    }),
  });

  useEffect(() => {
    let travel = 0;
    const show = (value: number) => {
      if (positionRef.current !== null) {
        positionRef.current.textContent = `${Math.round(value * travel).toString()} px`;
      }
      if (velocityRef.current !== null) {
        const speed = Math.round(progress.getVelocity() * travel);
        velocityRef.current.textContent = `${speed.toString()} px/s`;
      }
    };
    const resize = new ResizeObserver(() => {
      const lane = laneRef.current;
      const puck = puckRef.current;
      travel =
        lane === null || puck === null
          ? 0
          : lane.clientWidth - puck.offsetWidth;
      show(progress.get());
    });
    if (laneRef.current !== null) resize.observe(laneRef.current);
    const unsubscribe = progress.subscribe(show);
    return () => {
      resize.disconnect();
      unsubscribe();
    };
  }, [progress]);

  const spring = springOf(springRoles[role]);

  function onPointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return;
    const lane = laneRef.current;
    if (lane === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: progress.get(),
      travel: Math.max(1, lane.clientWidth - event.currentTarget.offsetWidth),
      isDragging: false,
      moves: [],
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.isDragging) {
      if (Math.abs(event.clientX - drag.startX) < DRAG_SLOP) return;
      // The puck can move after the press. Catch it where it shows now.
      drag.isDragging = true;
      draggedRef.current = true;
      drag.startX = event.clientX;
      drag.startValue = progress.get();
    }
    const time = event.timeStamp;
    drag.moves.push({ time, x: event.clientX });
    while (
      drag.moves.length > 2 &&
      time - drag.moves[0].time > VELOCITY_WINDOW
    ) {
      drag.moves.shift();
    }
    const first = drag.moves[0];
    const elapsed = (time - first.time) / 1000;
    const velocity =
      elapsed > 0 ? (event.clientX - first.x) / drag.travel / elapsed : 0;
    const value = drag.startValue + (event.clientX - drag.startX) / drag.travel;
    progress.set(unit(value), { velocity });
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.isDragging) return;
    const ahead = progress.get() + progress.getVelocity() * PROJECTION;
    progress.to(ahead > 0.5 ? 1 : 0, { spring });
  }

  return (
    <div css={stack.item}>
      <button
        type="button"
        aria-label={t({
          en: "Send the puck to the other end",
          zh: "让圆块移到另一端",
        })}
        css={[buttonReset.base, corner.radius_round, styles.track]}
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          progress.to(progress.target >= 0.5 ? 0 : 1, { spring });
        }}
      >
        <span ref={laneRef} css={styles.lane}>
          <span css={[corner.radius_round, styles.ring]} aria-hidden />
          <span
            ref={puckRef}
            css={[corner.radius_round, styles.puck]}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          />
        </span>
      </button>
      <div css={[cluster.item, styles.controls]}>
        <SegmentedControl
          aria-label={t({ en: "Role", zh: "角色" })}
          size="sm"
          value={role}
          onChange={setRole}
          options={[
            { value: "surface", label: "surface" },
            { value: "move", label: "move" },
            { value: "aim", label: "aim" },
          ]}
        />
        <dl css={[cluster.item, styles.readouts]}>
          <div css={[flex.row, typeRole.caption, styles.readout]}>
            <dt>{t({ en: "Position", zh: "位置" })}</dt>
            <dd css={[typeModifier.numeric, styles.number]}>
              <span ref={positionRef} />
            </dd>
          </div>
          <div css={[flex.row, typeRole.caption, styles.readout]}>
            <dt>{t({ en: "Velocity", zh: "速度" })}</dt>
            <dd css={[typeModifier.numeric, styles.number]}>
              <span ref={velocityRef} />
            </dd>
          </div>
        </dl>
      </div>
      {reduced ? (
        <p css={[typeRole.bodySmall, styles.note]}>
          {t({
            en: "Reduced motion is on, so the puck snaps to its end. A drag still follows your finger.",
            zh: "已开启减弱动效，因此圆块直接跳到终点。拖动时它仍会跟随手指。",
          })}
        </p>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  track: {
    position: "relative",
    display: "block",
    inlineSize: "100%",
    blockSize: space._8,
    backgroundColor: color.bgControlSunken,
    cursor: "pointer",
  },
  // The puck reads the width of the lane through `cqi`, so a resize needs no new pose.
  lane: {
    position: "absolute",
    insetBlock: 0,
    insetInline: space._1,
    display: "flex",
    alignItems: "center",
    containerType: "inline-size",
  },
  ring: {
    position: "absolute",
    insetInlineEnd: 0,
    inlineSize: PUCK,
    blockSize: PUCK,
    boxShadow: `inset 0 0 0 1.5px ${color.borderControl}`,
  },
  puck: {
    position: "relative",
    display: "block",
    flexShrink: 0,
    inlineSize: PUCK,
    blockSize: PUCK,
    backgroundColor: color.fg,
    cursor: "grab",
    touchAction: "pan-y",
  },
  controls: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  readouts: {
    margin: 0,
  },
  readout: {
    gap: rhythm.inline,
    alignItems: "baseline",
    color: color.fgMuted,
  },
  number: {
    margin: 0,
    minInlineSize: "6ch",
    fontFamily: font.familyMono,
    color: color.fg,
  },
  note: {
    margin: 0,
    color: color.fgMuted,
  },
});
