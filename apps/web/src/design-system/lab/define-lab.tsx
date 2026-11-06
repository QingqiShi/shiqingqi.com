import type { ComponentProps } from "react";
import { LabCanvas } from "./lab-canvas.tsx";
import type { LabConfig, LabSample } from "./types.ts";

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
