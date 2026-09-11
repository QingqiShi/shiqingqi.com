"use client";

import { Switch } from "@tuja/ui/components/switch";
import type { ComponentProps } from "react";
import { useState } from "react";
import switchDoc from "#src/_generated/props/switch.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";

type SwitchLabProps = ComponentProps<typeof Switch>;

// Switch needs no `label` prop of its own — an `aria-label` names it, so every
// Variant carries one.
const ARIA_LABEL = "Notifications";

/**
 * The Lab drives Switch by its `value` prop, which locks the thumb to that
 * value on every click. This local copy starts from `value` and re-syncs to
 * it when the panel changes it, but a click moves the thumb straight away —
 * so the Specimen stays operable, and `onChange` never joins the Lab's props
 * to reach the printed snippet. The sync happens during render, adjusting
 * state from a previous render's value rather than an effect, the way
 * https://react.dev/learn/you-might-not-need-an-effect resets state on a
 * changed prop.
 */
function OperableSwitch({ value, ...rest }: SwitchLabProps) {
  const [state, setState] = useState(value);
  const [renderedValue, setRenderedValue] = useState(value);
  if (value !== renderedValue) {
    setRenderedValue(value);
    setState(value);
  }
  return <Switch {...rest} value={state} onChange={setState} />;
}

const config: LabConfig<SwitchLabProps> = {
  component: "switch",
  element: "Switch",
  importPath: "@tuja/ui/components/switch",
  propsDoc: switchDoc,
  render: (props) => <OperableSwitch {...props} />,
  variants: [
    {
      id: "off",
      label: { en: "Off", zh: "关闭" },
      props: { value: "off", "aria-label": ARIA_LABEL },
    },
    {
      id: "on",
      label: { en: "On", zh: "开启" },
      props: { value: "on", "aria-label": ARIA_LABEL },
    },
    {
      id: "indeterminate",
      label: { en: "Indeterminate", zh: "未定" },
      props: { value: "indeterminate", "aria-label": ARIA_LABEL },
    },
  ],
  controls: ["size", "value", { prop: "disabled", kind: "boolean" }],
};

/** The Switch Lab: a live Switch on the Canvas, with its API beside it. */
export function SwitchLab() {
  return <LabCanvas config={config} />;
}
