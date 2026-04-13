"use client";

import { useState } from "react";

/**
 * Hook for optionally controlled state. When `controlled` is provided,
 * the component is driven by that value; otherwise it maintains its
 * own internal state starting from `defaultValue`.
 *
 * Returns a `[value, setValue]` pair. When controlled, `setValue` is a
 * no-op (the parent owns the state). When uncontrolled, `setValue`
 * updates the internal state.
 */
export function useControlled<T>({
  controlled,
  defaultValue,
}: {
  controlled: T | undefined;
  defaultValue: T;
}): [T, (next: T) => void] {
  // Captured once on mount — the controlled/uncontrolled decision is
  // fixed for the component's lifetime (same semantics as the old ref).
  const [isControlled] = useState(() => controlled !== undefined);
  const [internalValue, setInternalValue] = useState(defaultValue);

  // When controlled, use the provided value (falling back to
  // defaultValue for the impossible case where controlled becomes
  // undefined after initialisation).
  const value = isControlled ? (controlled ?? defaultValue) : internalValue;

  const setter = isControlled ? noop : setInternalValue;

  return [value, setter];
}

function noop() {
  // intentionally empty — state is owned by the parent
}
