import type { ComponentProps } from "react";
import { LabCanvas } from "./lab-canvas.tsx";
import type { LabConfig, LabSample, LabSetter } from "./types.ts";

/** One component's Lab: the Canvas drawn from its configuration. */
export function defineLab<P>(config: LabConfig<P>) {
  return function Lab() {
    return <LabCanvas config={config} />;
  };
}

/** The option that leaves the prop out altogether. */
export const NONE_SAMPLE: LabSample = {
  id: "none",
  label: { en: "None", zh: "无" },
  code: "",
  imports: [],
  value: undefined,
};

/** A handler for a Variant that needs one only to show its control. */
export function noop() {}

/** A link that keeps the Lab on its page when the visitor follows it. */
export function InertLink({ onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  );
}

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
