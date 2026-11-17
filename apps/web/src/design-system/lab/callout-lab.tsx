"use client";

import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import calloutDoc from "#src/_generated/props/callout.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { noop } from "./noop.ts";

export function CalloutLab() {
  const storageTitle = t({
    en: "Storage almost full",
    zh: "存储空间即将用满",
  });
  const storageBody = t({
    en: "You're using 92% of your plan's space.",
    zh: "你已使用套餐 92% 的空间。",
  });

  return (
    <LabCanvas
      config={{
        doc: calloutDoc,
        component: Callout,
        variants: [
          {
            id: "info",
            label: { en: "Info", zh: "信息" },
            props: {
              intent: "info",
              title: t({ en: "Heads up", zh: "请注意" }),
              children: t({
                en: "Your export keeps running in the background. We'll email you when it's ready.",
                zh: "导出将在后台继续运行，完成后我们会发邮件通知你。",
              }),
            },
          },
          {
            id: "success",
            label: { en: "Success", zh: "成功" },
            props: {
              intent: "success",
              title: t({ en: "Changes saved", zh: "更改已保存" }),
              children: t({
                en: "Your profile is live and visible to everyone.",
                zh: "你的资料已发布，所有人均可查看。",
              }),
            },
          },
          {
            id: "warning",
            label: { en: "Warning", zh: "警告" },
            props: {
              intent: "warning",
              title: storageTitle,
              children: storageBody,
            },
          },
          {
            id: "destructive",
            label: { en: "Destructive", zh: "破坏性" },
            props: {
              intent: "destructive",
              title: t({ en: "Payment failed", zh: "付款失败" }),
              children: t({
                en: "We couldn't charge the card ending in 4242. Update it to keep your subscription.",
                zh: "无法向尾号 4242 的卡扣款。请更新卡片以保留订阅。",
              }),
            },
          },
          {
            id: "primary",
            label: { en: "Primary", zh: "主要" },
            props: {
              intent: "primary",
              title: t({ en: "New in 2.0", zh: "2.0 新功能" }),
              children: t({
                en: "Segmented button groups now support leading icons.",
                zh: "分段按钮组现已支持前置图标。",
              }),
            },
          },
          {
            id: "neutral",
            label: { en: "Neutral", zh: "中性" },
            props: {
              intent: "neutral",
              title: t({ en: "Read-only workspace", zh: "只读工作区" }),
              children: t({
                en: "You have view access. Ask an owner for edit rights.",
                zh: "你拥有查看权限。如需编辑，请向所有者申请。",
              }),
            },
          },
          {
            id: "dismissible",
            label: { en: "Dismissible", zh: "可关闭" },
            props: {
              intent: "warning",
              title: storageTitle,
              children: storageBody,
              onDismiss: noop,
              dismissLabel: t({ en: "Dismiss", zh: "关闭" }),
            },
          },
        ],
        controls: ["title", "children", "intent"],
      }}
    />
  );
}
