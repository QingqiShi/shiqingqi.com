"use client";

import { Spinner } from "@tuja/ui/components/spinner";
import spinnerDoc from "#src/_generated/props/spinner.json";
import { defineLab } from "./define-lab.tsx";

const LABEL = "Loading";

export const SpinnerLab = defineLab({
  doc: spinnerDoc,
  component: Spinner,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: LABEL },
    },
    {
      id: "accent",
      label: { en: "Accent", zh: "强调色" },
      props: { label: LABEL, tone: "accent" },
    },
    {
      id: "small",
      label: { en: "Small", zh: "小号" },
      props: { label: LABEL, size: "sm" },
    },
    {
      id: "large",
      label: { en: "Large", zh: "大号" },
      props: { label: LABEL, size: "lg" },
    },
  ],
  controls: ["size", "tone", "label"],
});
