"use client";

import { t } from "@tuja/i18n";
import { Toast } from "@tuja/ui/components/toast";
import toastDoc from "#src/_generated/props/toast.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { noop } from "./noop.ts";

export function ToastLab() {
  const dismissLabel = t({ en: "Dismiss", zh: "关闭" });

  return (
    <LabCanvas
      config={{
        doc: toastDoc,
        component: Toast,
        variants: [
          {
            id: "undo",
            label: { en: "With Undo", zh: "带撤销" },
            props: {
              message: t({ en: "Transaction deleted", zh: "交易已删除" }),
              action: { label: t({ en: "Undo", zh: "撤销" }), onAction: noop },
              onDismiss: noop,
              dismissLabel,
            },
          },
          {
            id: "dismissible",
            label: { en: "Close only", zh: "仅关闭" },
            props: {
              message: t({ en: "Draft saved", zh: "草稿已保存" }),
              onDismiss: noop,
              dismissLabel,
            },
          },
          {
            id: "message",
            label: { en: "Message only", zh: "仅消息" },
            props: { message: t({ en: "Link copied", zh: "链接已复制" }) },
          },
        ],
        controls: ["message"],
      }}
    />
  );
}
