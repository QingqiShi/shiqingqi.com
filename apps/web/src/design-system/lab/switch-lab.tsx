"use client";

import { Switch } from "@tuja/ui/components/switch";
import type { ComponentProps } from "react";
import { useState } from "react";
import switchDoc from "#src/_generated/props/switch.json";
import { defineLab } from "./define-lab.tsx";

type SwitchLabProps = ComponentProps<typeof Switch>;

// A bare Switch takes an `aria-label`, so each bare Variant carries one.
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

export const SwitchLab = defineLab({
  doc: switchDoc,
  component: OperableSwitch,
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
    {
      id: "no-effect",
      label: { en: "No effect", zh: "无效果" },
      props: { value: "off", effect: "none", "aria-label": ARIA_LABEL },
    },
    {
      id: "labelled",
      label: { en: "With a label", zh: "带标签" },
      props: {
        value: "on",
        label: "Notifications",
        description: "Get a message when your report is ready.",
      },
    },
  ],
  controls: ["size", "value", "effect", "disabled"],
});
