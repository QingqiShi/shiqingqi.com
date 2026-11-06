"use client";

import { Checkbox } from "@tuja/ui/components/checkbox";
import checkboxDoc from "#src/_generated/props/checkbox.json";
import { defineLab } from "./define-lab.tsx";

const LABEL = "Email me about product updates";

export const CheckboxLab = defineLab({
  doc: checkboxDoc,
  component: Checkbox,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: LABEL },
    },
    {
      id: "description",
      label: { en: "With a description", zh: "带说明" },
      props: {
        label: LABEL,
        description: "One email a month, and never more.",
      },
    },
    {
      id: "indeterminate",
      label: { en: "Indeterminate", zh: "部分选中" },
      props: { label: "Select all", indeterminate: true },
    },
    {
      id: "error",
      label: { en: "With an error", zh: "带错误" },
      props: {
        label: "Accept the terms",
        error: "You must accept the terms to continue.",
      },
    },
    {
      id: "small",
      label: { en: "Small", zh: "小号" },
      props: { label: LABEL, size: "sm" },
    },
    {
      id: "disabled",
      label: { en: "Disabled", zh: "禁用" },
      props: { label: LABEL, disabled: true },
    },
  ],
  controls: [
    "label",
    "description",
    "error",
    "size",
    "indeterminate",
    "labelHidden",
    "disabled",
  ],
});
