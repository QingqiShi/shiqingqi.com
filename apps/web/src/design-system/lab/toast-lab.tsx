"use client";

import { Toast } from "@tuja/ui/components/toast";
import type { ComponentProps } from "react";
import toastDoc from "#src/_generated/props/toast.json";
import { LabCanvas } from "./lab-canvas.tsx";
import type { LabConfig } from "./types.ts";

type ToastLabProps = ComponentProps<typeof Toast>;

function noop() {}

const config: LabConfig<ToastLabProps> = {
  component: "toast",
  element: "Toast",
  importPath: "@tuja/ui/components/toast",
  propsDoc: toastDoc,
  render: (props) => <Toast {...props} />,
  variants: [
    {
      id: "undo",
      label: { en: "With Undo", zh: "带撤销" },
      props: {
        message: "Transaction deleted",
        action: { label: "Undo", onAction: noop },
        onDismiss: noop,
        dismissLabel: "Dismiss",
      },
    },
    {
      id: "dismissible",
      label: { en: "Close only", zh: "仅关闭" },
      props: {
        message: "Draft saved",
        onDismiss: noop,
        dismissLabel: "Dismiss",
      },
    },
    {
      id: "message",
      label: { en: "Message only", zh: "仅消息" },
      props: { message: "Link copied" },
    },
  ],
  controls: ["message"],
};

/** The Toast Lab: the toast's surface on the Canvas, with its API beside it. */
export function ToastLab() {
  return <LabCanvas config={config} />;
}
