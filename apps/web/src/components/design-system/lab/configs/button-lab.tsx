"use client";

import { Button } from "@tuja/ui/components/button";
import type { ComponentProps } from "react";
import buttonDoc from "#src/_generated/props/button.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";
import { labIconSamples } from "./lab-icon-samples.tsx";

type ButtonLabProps = ComponentProps<typeof Button>;

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "Save changes";

const config: LabConfig<ButtonLabProps> = {
  component: "button",
  element: "Button",
  importPath: "@tuja/ui/components/button",
  propsDoc: buttonDoc,
  render: (props) => <Button {...props} />,
  variants: [
    {
      id: "primary",
      label: { en: "Primary", zh: "主要" },
      props: { children: LABEL, look: "primary" },
    },
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: LABEL },
    },
    {
      id: "outline",
      label: { en: "Outline", zh: "描边" },
      props: { children: LABEL, look: "outline" },
    },
    {
      id: "ghost",
      label: { en: "Ghost", zh: "无框" },
      props: { children: LABEL, look: "ghost" },
    },
    {
      id: "danger",
      label: { en: "Danger", zh: "危险" },
      props: { children: "Delete", look: "danger", icon: "trash" },
    },
    {
      id: "iconOnly",
      label: { en: "Icon only", zh: "纯图标" },
      props: { icon: "plus", "aria-label": "Add item" },
    },
    {
      id: "busy",
      label: { en: "Busy", zh: "忙碌" },
      props: { children: "Saving", loading: true },
    },
  ],
  controls: [
    "children",
    "look",
    "size",
    { prop: "icon", samples: labIconSamples },
    "bright",
    "isActive",
    "loading",
    "hideLabelOnMobile",
    { prop: "disabled", kind: "boolean" },
  ],
};

/** The Button Lab: a live Button on the Canvas, with its API beside it. */
export function ButtonLab() {
  return <LabCanvas config={config} />;
}
