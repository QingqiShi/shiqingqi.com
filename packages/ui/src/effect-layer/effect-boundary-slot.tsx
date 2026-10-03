"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, type ReactElement } from "react";
import type { EffectRole } from "./effect-roles.ts";
import { useEffectBoundary } from "./use-effect-boundary.ts";

const BOUNDARY_ATTRIBUTE = "data-effect-boundary";

/**
 * The element a slot registers: its first child element, looking through the
 * slots nested inside it, so that nested wrappers register the same element.
 */
function findBoundaryElement(slot: Element) {
  let element = slot.firstElementChild;
  while (element?.hasAttribute(BOUNDARY_ATTRIBUTE) === true) {
    element = element.firstElementChild;
  }
  return element;
}

interface EffectBoundarySlotProps {
  roles: readonly EffectRole[];
  /**
   * Data attributes for the wrapper, such as an effect's settings. An effect
   * reads them from the element with `closest()`.
   */
  attributes?: Readonly<Record<`data-${string}`, string | number>>;
  children: ReactElement;
}

/**
 * Registers its first child element with a set of roles, through a wrapper
 * with no box. `EffectBoundary` and each effect's own wrapper render it. It
 * follows the child when React replaces it.
 *
 * @internal
 */
export function EffectBoundarySlot({
  roles,
  attributes,
  children,
}: EffectBoundarySlotProps) {
  const slotRef = useRef<HTMLSpanElement>(null);
  const register = useEffectBoundary({ roles });

  useEffect(() => {
    const slot = slotRef.current;
    if (slot === null) {
      return;
    }
    let element: Element | null = null;
    let unregister: (() => void) | undefined;
    const update = () => {
      const next = findBoundaryElement(slot);
      if (next === element) {
        return;
      }
      unregister?.();
      element = next;
      unregister = next === null ? undefined : register(next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(slot, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      unregister?.();
    };
  }, [register]);

  return (
    <span
      ref={slotRef}
      {...attributes}
      data-effect-boundary=""
      css={styles.slot}
    >
      {children}
    </span>
  );
}

const styles = stylex.create({
  slot: {
    display: "contents",
  },
});
