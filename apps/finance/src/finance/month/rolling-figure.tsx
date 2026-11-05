"use client";

import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { monthSpring } from "./use-month-slide.ts";

interface RollingFigureProps {
  value: number;
  format: (value: number) => string;
  css?: StyleProp;
}

/**
 * A figure that counts to its new value on the month's spring, from 0 when
 * it first shows. A screen reader reads only the value it lands on. Under
 * reduced motion it changes at once.
 */
export function RollingFigure({ value, format, css }: RollingFigureProps) {
  const engine = useMotionEngine();
  const shown = useMotionValue(engine, 0, { precision: 1 });
  const ref = useRef<HTMLSpanElement>(null);
  const label = format(value);
  const draw = useEffectEvent((at: number) => {
    const element = ref.current;
    if (element !== null) element.textContent = format(at);
  });

  useLayoutEffect(
    () =>
      shown.subscribe((at) => {
        draw(at);
      }),
    [shown],
  );

  useLayoutEffect(() => {
    draw(shown.get());
  }, [shown, label]);

  useEffect(() => {
    shown.to(value, { spring: monthSpring });
  }, [shown, value]);

  return (
    <span css={css}>
      <span ref={ref} aria-hidden />
      <span css={a11y.srOnly}>{label}</span>
    </span>
  );
}
