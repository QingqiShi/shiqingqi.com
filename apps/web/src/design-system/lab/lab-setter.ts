import type { LabSetter } from "./types.ts";

/**
 * A stand-in for the setter that the snippet's `useState` line declares, so
 * that content from `labSource` sets the Lab's state as a reader's code would.
 * Name the constant as the snippet names the setter, `setIsOpen` for
 * `isOpen`, and give it to the state binding.
 */
export function labSetter<T>(): LabSetter<T> {
  let target: ((next: unknown) => void) | undefined;
  return Object.assign(
    (next: T) => {
      target?.(next);
    },
    {
      connect(set: (next: unknown) => void) {
        target = set;
        return () => {
          if (target === set) target = undefined;
        };
      },
    },
  );
}
