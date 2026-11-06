"use client";

import { Toast } from "@tuja/ui/components/toast";
import toastDoc from "#src/_generated/props/toast.json";
import { defineLab, noop } from "./define-lab.tsx";

export const ToastLab = defineLab({
  doc: toastDoc,
  component: Toast,
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
});
