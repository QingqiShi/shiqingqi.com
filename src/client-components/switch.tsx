"use client";

import useControlled from "@mui/utils/useControlled";
import * as stylex from "@stylexjs/stylex";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { tokens } from "@/tokens.stylex";
import type { StyleProp } from "@/types";
import { switchTokens } from "./switch.stylex";

export type SwitchState = "off" | "on" | "indeterminate";

interface SwitchProps
  extends Omit<
    React.ComponentProps<"input">,
    "onChange" | "className" | "style"
  > {
  value?: SwitchState;
  onChange?: (state: SwitchState) => void;
  style?: StyleProp;
}

export function Switch({
  value: valueProp,
  onChange,
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
      {...stylex.props(
        styles.switch,
        isDragging && styles.dragging(position),
        style
      )}
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

const THUMB_SIZE = "36px";
const TRACK_SIZE = `calc(${THUMB_SIZE} * 2)`;

const styles = stylex.create({
  switch: {
    // Reset
    background: "none",
    borderWidth: "0",
    borderStyle: "none",
    appearance: "none",
    boxSizing: "content-box",
    fontSize: "16px",
    margin: 0,

    // Custom styles
    inlineSize: TRACK_SIZE,
    blockSize: THUMB_SIZE,
    borderRadius: THUMB_SIZE,
    backgroundColor: {
      default: tokens.controlTrack,
      ":checked": tokens.controlActive,
    },
    boxShadow: {
      default: tokens.shadowControls,
      ":hover": { "::before": tokens.shadowHighlight },
    },
    position: "relative",
    padding: "2px",
    display: "flex",
    transition: `background-color 0.2s ease`,
    cursor: "pointer",

    [switchTokens.thumbPosition]: {
      default: "0",
      ":checked": `calc(${TRACK_SIZE} - ${THUMB_SIZE})`,
      ":indeterminate": `calc(${TRACK_SIZE} / 2 - ${THUMB_SIZE} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": tokens.shadowHighlight,
    },

    // Pseudo elements
    "::before": {
      content: "",
      display: "block",
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE,
      backgroundColor: tokens.controlThumb,
      zIndex: 150,
      transform: `translateX(${switchTokens.thumbPosition})`,
      transition: `transform ${switchTokens.thumbTransitionDuration} ease, box-shadow 0.4s ease`,
      boxShadow: switchTokens.thumbShadow,
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
