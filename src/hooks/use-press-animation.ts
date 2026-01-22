import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

const PRESS_ANIMATION_DURATION = 150;
const MAX_NUDGE_OFFSET = 4;

function isPointerOutside(
  rect: DOMRect | undefined,
  clientX: number,
  clientY: number,
): boolean {
  return (
    !rect ||
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  );
}

interface UsePressAnimationOptions<T extends HTMLElement> {
  disabled?: boolean;
  targetRef: RefObject<T | null>;
}

interface UsePressAnimationReturn<T extends HTMLElement> {
  isPressed: boolean;
  releasedOutside: boolean;
  nudgeOffset: { x: number; y: number };
  handlers: {
    onPointerDown: (event: ReactPointerEvent<T>) => void;
    onPointerUp: (event: ReactPointerEvent<T>) => void;
    onPointerMove: (event: ReactPointerEvent<T>) => void;
    onKeyDown: (event: KeyboardEvent<T>) => void;
    onKeyUp: (event: KeyboardEvent<T>) => void;
    onContextMenu: (event: MouseEvent<T>) => void;
  };
  /** Returns true if click should be allowed, false if it was released outside */
  shouldAllowClick: () => boolean;
}

export function usePressAnimation<T extends HTMLElement>({
  disabled,
  targetRef,
}: UsePressAnimationOptions<T>): UsePressAnimationReturn<T> {
  const pressStartTimeRef = useRef<number>(0);
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);
  const releasedOutsideRef = useRef(false);

  const [isPressed, setIsPressed] = useState(false);
  const [releasedOutside, setReleasedOutside] = useState(false);
  const [nudgeOffset, setNudgeOffset] = useState({ x: 0, y: 0 });

  const clearReleaseTimeout = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  const handlePress = useCallback(() => {
    if (disabled) return;
    clearReleaseTimeout();

    const el = targetRef.current;

    if (isPressedRef.current && el) {
      // Instant reset: disable transition, force scale 1.0
      el.style.transition = "none";
      el.style.transform = "scale(1) translate(0, 0)";
      el.style.filter = "brightness(1)";

      // Force browser to synchronously commit the scale(1) state
      void el.offsetHeight;

      // Re-enable transition and clear inline styles
      // CSS sees value change: scale(1) → scale(1.05) → animates
      el.style.transition = "";
      el.style.transform = "";
      el.style.filter = "";
    }

    setIsPressed(true);
    isPressedRef.current = true;
    setReleasedOutside(false);
    setNudgeOffset({ x: 0, y: 0 });
    pressStartTimeRef.current = performance.now();
  }, [disabled, clearReleaseTimeout, targetRef]);

  const handleRelease = useCallback((isOutside: boolean) => {
    if (!isPressedRef.current) return;

    const elapsed = performance.now() - pressStartTimeRef.current;
    const remaining = PRESS_ANIMATION_DURATION - elapsed;

    if (remaining > 0) {
      // Quick click: wait for press animation to complete
      setReleasedOutside(isOutside);
      releaseTimeoutRef.current = setTimeout(() => {
        setIsPressed(false);
        isPressedRef.current = false;
        setNudgeOffset({ x: 0, y: 0 });
      }, remaining);
    } else {
      // Normal release
      setReleasedOutside(isOutside);
      setIsPressed(false);
      isPressedRef.current = false;
      setNudgeOffset({ x: 0, y: 0 });
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (disabled) return;

      // Capture pointer to receive pointerup even outside the element
      targetRef.current?.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;
      handlePress();
    },
    [disabled, handlePress, targetRef],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (pointerIdRef.current !== null) {
        targetRef.current?.releasePointerCapture(pointerIdRef.current);
        pointerIdRef.current = null;
      }
      // Check actual pointer position since pointerleave doesn't fire with pointer capture
      const rect = targetRef.current?.getBoundingClientRect();
      const isOutside = isPointerOutside(rect, event.clientX, event.clientY);
      releasedOutsideRef.current = isOutside; // Set synchronously before click fires
      handleRelease(isOutside);
    },
    [handleRelease, targetRef],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (!isPressed || !targetRef.current) return;

      const rect = targetRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Check if pointer is outside the button
      const isOutside = isPointerOutside(rect, event.clientX, event.clientY);

      if (isOutside) {
        // Calculate direction from center to pointer
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          // Normalize and scale to max offset
          const scale = Math.min(MAX_NUDGE_OFFSET / distance, 1);
          setNudgeOffset({
            x: dx * scale,
            y: dy * scale,
          });
        }
      } else {
        setNudgeOffset({ x: 0, y: 0 });
      }
    },
    [isPressed, targetRef],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        // Prevent space from scrolling the page
        if (event.key === " ") {
          event.preventDefault();
        }
        handlePress();
      }
    },
    [disabled, handlePress],
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<T>) => {
      if (event.key === "Enter" || event.key === " ") {
        handleRelease(false);
      }
    },
    [handleRelease],
  );

  // Prevent context menu from interrupting the press state
  const onContextMenu = useCallback(
    (_event: MouseEvent<T>) => {
      if (isPressed) {
        handleRelease(true);
      }
    },
    [isPressed, handleRelease],
  );

  // Returns true if click should be allowed, resets the flag
  const shouldAllowClick = useCallback(() => {
    if (releasedOutsideRef.current) {
      releasedOutsideRef.current = false;
      return false;
    }
    return true;
  }, []);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current !== null) {
        clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, []);

  // Release press state when window loses focus (e.g., Alt-Tab)
  useEffect(() => {
    const handleWindowBlur = () => {
      if (isPressedRef.current) {
        handleRelease(true);
      }
    };
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [handleRelease]);

  return {
    isPressed,
    releasedOutside,
    nudgeOffset,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerMove,
      onKeyDown,
      onKeyUp,
      onContextMenu,
    },
    shouldAllowClick,
  };
}
