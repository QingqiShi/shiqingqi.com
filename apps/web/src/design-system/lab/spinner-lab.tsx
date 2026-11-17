"use client";

import { t } from "@tuja/i18n";
import { Spinner } from "@tuja/ui/components/spinner";
import spinnerDoc from "#src/_generated/props/spinner.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function SpinnerLab() {
  const label = t({ en: "Loading", zh: "加载中" });

  return (
    <LabCanvas
      config={{
        doc: spinnerDoc,
        component: Spinner,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label },
          },
          {
            id: "primary",
            label: { en: "Primary", zh: "主要" },
            props: { label, tone: "primary" },
          },
          {
            id: "small",
            label: { en: "Small", zh: "小号" },
            props: { label, size: "sm" },
          },
          {
            id: "large",
            label: { en: "Large", zh: "大号" },
            props: { label, size: "lg" },
          },
        ],
        controls: ["size", "tone", "label"],
      }}
    />
  );
}
