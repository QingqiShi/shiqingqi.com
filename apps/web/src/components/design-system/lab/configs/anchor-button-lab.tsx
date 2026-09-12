"use client";

import { AnchorButton } from "@tuja/ui/components/anchor-button";
import type { ComponentProps } from "react";
import anchorButtonDoc from "#src/_generated/props/anchor-button.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";
import { labIconSamples } from "./lab-icon-samples.tsx";

type AnchorButtonLabProps = ComponentProps<typeof AnchorButton>;

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "Back to films";

// A placeholder destination, so operating the Specimen never navigates off the
// Lab.
const HREF = "#";

const config: LabConfig<AnchorButtonLabProps> = {
  component: "anchor-button",
  element: "AnchorButton",
  importPath: "@tuja/ui/components/anchor-button",
  propsDoc: anchorButtonDoc,
  render: (props) => <AnchorButton {...props} />,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: LABEL, href: HREF },
    },
    {
      id: "primary",
      label: { en: "Primary", zh: "主要" },
      props: { children: LABEL, href: HREF, look: "primary" },
    },
    {
      id: "outline",
      label: { en: "Outline", zh: "描边" },
      props: { children: LABEL, href: HREF, look: "outline" },
    },
    {
      id: "ghost",
      label: { en: "Ghost", zh: "无框" },
      props: { children: LABEL, href: HREF, look: "ghost" },
    },
    {
      id: "iconOnly",
      label: { en: "Icon only", zh: "纯图标" },
      props: { href: HREF, icon: "plus", "aria-label": "Add item" },
    },
    {
      id: "bright",
      label: { en: "Bright", zh: "明亮" },
      props: { children: LABEL, href: HREF, bright: true },
    },
  ],
  controls: [
    "children",
    "look",
    "size",
    { prop: "icon", samples: labIconSamples },
    "bright",
    "isActive",
    "hideLabelOnMobile",
  ],
};

/** The Anchor button Lab: a live AnchorButton on the Canvas, with its API beside it. */
export function AnchorButtonLab() {
  return <LabCanvas config={config} />;
}
