"use client";

import useControlled from "@mui/utils/useControlled";
import * as stylex from "@stylexjs/stylex";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

interface SwitchProps extends Omit<React.ComponentProps<"input">, "onChange"> {
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

  const setControlledValue = useCallback(
    (newValue: SwitchState) => {
      setValue(newValue);
      onChange?.(newValue);
    },
    [onChange, setValue]
  );

  // Sync value with input due to check box having two different value states (specifically `indeterminate`)
  useEffect(() => {
    if (!elRef.current) {
      return;
    }
    elRef.current.indeterminate = value === "indeterminate";
  }, [value]);

  // States and refs for tracking dragging state
  const initialRectRef = useRef<DOMRect | null>(null);
  const initialClientXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const ignoreOnChange = useRef(false);

  const handleDragStart = (e: GenericTouchPointerEvent) => {
    const normalizedEvent = normalizeTouchPointerEvent(e);
    if (rest.disabled || !elRef.current || !normalizedEvent) {
      return;
    }
    ignoreOnChange.current = false;
    initialRectRef.current = elRef.current.getBoundingClientRect();
    initialClientXRef.current = normalizedEvent.clientX;
    setIsPointerDown(true);
  };

  const handleDragMove = useCallback(
    (e: GenericTouchPointerEvent) => {
      const normalizedEvent = normalizeTouchPointerEvent(e);
      const rect = initialRectRef.current;
      const clientX = initialClientXRef.current;
      if (!rect || !normalizedEvent) {
        return;
      }
      // Has to move at least 2px to be considered dragging
      if (!isDragging && Math.abs(normalizedEvent.clientX - clientX) < 2) {
        return;
      }
      setIsDragging(true);
      lastClientXRef.current = normalizedEvent.clientX;
      const x = normalizedEvent.clientX - rect.left - rect.height / 2;
      const clampedX = Math.max(0, Math.min(rect.width - rect.height, x));
      setPosition(clampedX);
    },
    [isDragging]
  );

  // Pointermove handler is registered on the body to support dragging out of the switch boundary
  useEffect(() => {
    if (!isPointerDown) {
      return;
    }

    document.body.addEventListener("pointermove", handleDragMove);
    document.body.addEventListener("touchmove", handleDragMove);
    return () => {
      document.body.removeEventListener("pointermove", handleDragMove);
      document.body.removeEventListener("touchmove", handleDragMove);
    };
  }, [handleDragMove, isPointerDown]);

  const handleDragEnd = useCallback(() => {
    const rect = initialRectRef.current;
    setIsDragging(false);
    setPosition(null);
    initialRectRef.current = null;

    if (isDragging) {
      if (!rect) {
        return;
      }
      if (elRef.current) {
        if (elRef.current.indeterminate) {
          elRef.current.indeterminate = false;
        }

        const midPoint = rect.left + rect.width / 2;
        const newState = lastClientXRef.current > midPoint ? "on" : "off";
        setControlledValue(newState);
        ignoreOnChange.current = true;
      }
    }
  }, [isDragging, setControlledValue]);

  // Pointerup handler is registered on the body to support ending drag outside of switch boundary
  useEffect(() => {
    document.body.addEventListener("pointerup", handleDragEnd);
    document.body.addEventListener("touchend", handleDragEnd);
    return () => {
      document.body.removeEventListener("pointerup", handleDragEnd);
      document.body.removeEventListener("touchend", handleDragEnd);
    };
  }, [handleDragEnd]);

  return (
    <input
      ref={elRef}
      {...rest}
      className={className}
      style={style}
      css={[styles.switch, isDragging && styles.dragging(position)]}
      type="checkbox"
      checked={value === "on" ? true : value === "off" ? false : undefined}
      onPointerDown={handleDragStart}
      onTouchStart={handleDragStart}
      onChange={(e) => {
        // onChange still fires after dragging, so we need to ignore this event
        // if dragEnd event had occurred.
        if (ignoreOnChange.current) {
          ignoreOnChange.current = false;
          return;
        }
        setControlledValue(e.target.checked ? "on" : "off");
      }}
    />
  );
}

const styles = stylex.create({
  switch: {
    // Reset
    background: "none",
    borderWidth: "0",
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

    [switchTokens.thumbPosition]: {
      default: "0",
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
      transition: `transform ${switchTokens.thumbTransitionDuration} ease, box-shadow 0.4s ease`,
      zIndex: layer.content,
    },
  },
  dragging: (position) => ({
    [switchTokens.thumbPosition]: `${position}px`,
    "::before": {
      transition: null,
    },
  }),
});

type GenericTouchPointerEvent =
  | PointerEvent
  | TouchEvent
  | React.PointerEvent<HTMLInputElement>
  | React.TouchEvent<HTMLInputElement>;

function normalizeTouchPointerEvent(e: GenericTouchPointerEvent) {
  if ("touches" in e && e.touches.length !== 1) {
    return;
  }
  const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
  return { clientX };
}
