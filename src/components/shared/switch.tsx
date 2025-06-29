// @inferEffectDependencies
"use client";

import useControlled from "@mui/utils/useControlled";
import * as stylex from "@stylexjs/stylex";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  backdropEffects,
  border,
  color,
  controlSize,
  font,
  layer,
  ratio,
  shadow,
} from "@/tokens.stylex";
import { GlassSurface } from "./glass-surface";
import { switchTokens } from "./switch.stylex";

export type SwitchState = "off" | "on" | "indeterminate";

interface SwitchProps
  extends Omit<React.ComponentProps<"input">, "checked" | "onChange"> {
  value?: SwitchState;
  onChange?: (state: SwitchState) => void;
  offIcon?: React.ReactNode;
  onIcon?: React.ReactNode;
}

export function Switch({
  value: valueProp,
  onChange,
  className,
  style,
  offIcon,
  onIcon,
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
  useLayoutEffect(() => {
    if (!elRef.current) {
      return;
    }
    elRef.current.indeterminate = value === "indeterminate";
    elRef.current.checked = value === "on";
  }, [value]);

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
  }, []);

  return (
    <GlassSurface>
      <div
        css={[
          styles.container,
          value === "on" && styles.checked,
          value === "indeterminate" && styles.indeterminate,
          isDragging && styles.dragging(position),
        ]}
      >
        <input
          ref={elRef}
          {...rest}
          className={className}
          style={style}
          css={styles.switch}
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
        <div
          css={[styles.thumb, initialRendered && !isDragging && styles.animate]}
        />
        {offIcon && (
          <span css={[styles.icon, styles.off]} aria-hidden>
            {offIcon}
          </span>
        )}
        {onIcon && (
          <span css={[styles.icon, styles.on]} aria-hidden>
            {onIcon}
          </span>
        )}
      </div>
    </GlassSurface>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    position: "relative",
    zIndex: layer.base,
    [switchTokens.thumbPosition]: "0",
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": shadow._3,
    },
  },
  checked: {
    [switchTokens.thumbPosition]: controlSize._9,
  },
  indeterminate: {
    [switchTokens.thumbPosition]: `calc(${controlSize._9} / 2)`,
  },
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
    display: "block",
    height: controlSize._9,
    padding: border.size_2,
    position: "relative",
    transition: `background-color 0.2s ease`,
    backgroundColor: {
      default: color.backgroundGlass,
      ":checked": color.controlActive,
    },
    touchAction: "none",
    backdropFilter: backdropEffects.controls,
  },
  thumb: {
    position: "absolute",
    left: border.size_2,
    top: border.size_2,
    backgroundColor: color.controlThumb,
    borderRadius: border.radius_round,
    boxShadow: switchTokens.thumbShadow,
    display: "block",
    width: `calc(${controlSize._9} - ${border.size_2} * 2)`,
    aspectRatio: ratio.square,
    transform: `translateX(${switchTokens.thumbPosition})`,
    transition: null,
    zIndex: layer.content,
    pointerEvents: "none",
  },
  animate: {
    transition: `transform ${switchTokens.thumbTransitionDuration} ease, box-shadow 0.4s ease`,
  },
  icon: {
    position: "absolute",
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    aspectRatio: ratio.square,
    fontSize: font.size_1,
    width: controlSize._9,
  },
  off: {
    left: 0,
  },
  on: {
    right: 0,
  },
  dragging: (position) => ({
    [switchTokens.thumbPosition]: `${position}px`,
  }),
});
