"use client";

import { Chip } from "@tuja/ui/components/chip";
import type { ComponentProps } from "react";
import chipDoc from "#src/_generated/props/chip.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";
import { labIconSamples } from "./lab-icon-samples.tsx";

type ChipLabProps = ComponentProps<typeof Chip>;

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "Now playing";

const config: LabConfig<ChipLabProps> = {
  component: "chip",
  element: "Chip",
  importPath: "@tuja/ui/components/chip",
  propsDoc: chipDoc,
  render: (props) => <Chip {...props} />,
  variants: [
    {
      id: "button",
      label: { en: "Button", zh: "按钮" },
      props: { children: LABEL },
    },
    {
      id: "selected",
      label: { en: "Selected", zh: "已选中" },
      props: { children: LABEL, isActive: true },
    },
    {
      id: "link",
      label: { en: "Link", zh: "链接" },
      props: { children: LABEL, href: "#" },
    },
    {
      id: "withIcon",
      label: { en: "With icon", zh: "带图标" },
      props: { children: "Add filter", icon: "plus" },
    },
  ],
  controls: [
    "children",
    "size",
    "isActive",
    { prop: "icon", samples: labIconSamples },
    { prop: "disabled", kind: "boolean" },
  ],
};

/** The Chip Lab: a live Chip on the Canvas, with its API beside it. */
export function ChipLab() {
  return <LabCanvas config={config} />;
}
