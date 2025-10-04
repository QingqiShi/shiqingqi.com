// @inferEffectDependencies
"use client";

import useControlled from "@mui/utils/useControlled";
import * as stylex from "@stylexjs/stylex";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  border,
  color,
  controlSize,
  layer,
  ratio,
  shadow,
} from "@/tokens.stylex";
import { switchTokens } from "./switch.stylex";

export type SwitchState = "off" | "on" | "indeterminate";

interface SwitchProps
  extends Omit<React.ComponentProps<"input">, "checked" | "onChange"> {
  value?: SwitchState;
  onChange?: (state: SwitchState) => void;
}

export function Switch({
  value: valueProp,
  onChange,
  className,
  style,
  ...rest
}: SwitchProps) {
  const elRef = useRef<HTMLInputElement>(null);

  // Optionally controlled state
  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: "off",
    name: "Switch",
  });

  function setControlledValue(newValue: SwitchState) {
    setValue(newValue);
    onChange?.(newValue);
  }

  // Sync value with input due to check box having two different value states (specifically `indeterminate`)
  useLayoutEffect(() => {
    if (!elRef.current) {
      return;
    }
    elRef.current.indeterminate = value === "indeterminate";
    elRef.current.checked = value === "on";
  });

  // States and refs for tracking dragging state
  const initialRectRef = useRef<DOMRect | null>(null);
  const initialClientXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  function handleDragStart(e: React.PointerEvent<HTMLInputElement>) {
    if (
      rest.disabled ||
      !elRef.current ||
      (e.pointerType === "mouse" && e.button !== 0)
    ) {
      return;
    }
    initialRectRef.current = elRef.current.getBoundingClientRect();
    initialClientXRef.current = e.clientX;

    elRef.current.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLInputElement>) {
    const rect = initialRectRef.current;
    const clientX = initialClientXRef.current;
    if (!rect) {
      return;
    }

    // Has to move at least 2px to be considered dragging
    if (!isDragging && Math.abs(e.clientX - clientX) < 2) {
      return;
    }
    setIsDragging(true);

    // Get thumb position
    lastClientXRef.current = e.clientX;
    const x = e.clientX - rect.left - rect.height / 2;
    const clampedX = Math.max(0, Math.min(rect.width - rect.height, x));
    setPosition(clampedX);

    // Actually modify the value
    const midPoint = rect.left + rect.width / 2;
    const newState = lastClientXRef.current > midPoint ? "on" : "off";
    if (newState !== value) {
      setControlledValue(newState);
    }
  }

  function handleDragEnd(e: React.PointerEvent<HTMLInputElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }

    if (isDragging) {
      const rect = initialRectRef.current;
      if (elRef.current && rect) {
        if (elRef.current.indeterminate) {
          elRef.current.indeterminate = false;
        }

        const midPoint = rect.left + rect.width / 2;
        const newState = lastClientXRef.current > midPoint ? "on" : "off";
        setControlledValue(newState);
      }
    } else {
      setControlledValue(value === "on" ? "off" : "on");
    }

    elRef.current?.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setPosition(null);
    initialRectRef.current = null;
  }

  // Enable animation styles only after the component has fully mounted
  // This prevents switches from animating when switching routes or changing locales
  const [initialRendered, setInitialRendered] = useState(false);
  useEffect(() => {
    setInitialRendered(true);
  });

  return (
    <input
      ref={elRef}
      {...rest}
      className={className}
      style={style}
      css={[
        styles.switch,
        initialRendered && styles.animate,
        isDragging && styles.dragging(position),
      ]}
      type="checkbox"
      onPointerDown={handleDragStart}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDragMove}
      onKeyDown={(e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setControlledValue(value === "on" ? "off" : "on");
        }
      }}
      onChange={(e) => e.preventDefault()}
      onClick={(e) => e.preventDefault()}
    />
  );
}

const styles = stylex.create({
  switch: {
    // Reset
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    fontSize: controlSize._4,
    margin: 0,

    // Custom styles
    aspectRatio: ratio.double,
    borderRadius: border.radius_round,
    cursor: "pointer",
    display: "flex",
    height: controlSize._9,
    padding: border.size_2,
    position: "relative",
    transition: `background-color 0.2s ease`,
    backgroundColor: {
      default: color.controlTrack,
      ":checked": color.controlActive,
    },
    boxShadow: {
      default: shadow._2,
      ":hover": { "::before": shadow._3 },
    },
    touchAction: "none",

    [switchTokens.thumbPosition]: {
      default: 0,
      ":checked": controlSize._9,
      ":indeterminate": `calc(${controlSize._9} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": shadow._3,
    },

    // Pseudo elements
    "::before": {
      backgroundColor: color.controlThumb,
      borderRadius: border.radius_round,
      boxShadow: switchTokens.thumbShadow,
      content: "",
      display: "block",
      width: `calc(${controlSize._9} - ${border.size_2} * 2)`,
      aspectRatio: ratio.square,
      transform: `translateX(${switchTokens.thumbPosition})`,
      transition: null,
      zIndex: layer.content,
    },
  },
  animate: {
    "::before": {
      transition: `transform ${switchTokens.thumbTransitionDuration} ease, box-shadow 0.4s ease`,
    },
  },
  dragging: (position) => ({
    [switchTokens.thumbPosition]: `${position}px`,
    "::before": {
      transition: null,
    },
  }),
});
