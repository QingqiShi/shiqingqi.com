"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import buttonDoc from "#src/_generated/props/button.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labIconSamples } from "./lab-icon-samples.tsx";

export function ButtonLab() {
  const save = t({ en: "Save changes", zh: "保存更改" });
  const remove = t({ en: "Delete", zh: "删除" });

  return (
    <LabCanvas
      config={{
        doc: buttonDoc,
        component: Button,
        variants: [
          {
            id: "primary",
            label: { en: "Primary", zh: "主要" },
            props: { children: save, look: "primary" },
          },
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { children: save },
          },
          {
            id: "outline",
            label: { en: "Outline", zh: "描边" },
            props: { children: save, look: "outline" },
          },
          {
            id: "ghost",
            label: { en: "Ghost", zh: "无框" },
            props: { children: save, look: "ghost" },
          },
          {
            id: "destructive",
            label: { en: "Destructive", zh: "破坏性" },
            props: {
              children: remove,
              look: "primary",
              intent: "destructive",
              icon: "trash",
            },
          },
          {
            id: "quietDestructive",
            label: { en: "Quiet destructive", zh: "次要破坏性" },
            props: { children: remove, look: "outline", intent: "destructive" },
          },
          {
            id: "bleed",
            label: { en: "Bleed", zh: "越过边缘" },
            props: {
              children: t({ en: "All reports", zh: "全部晨报" }),
              look: "ghost",
              size: "sm",
              bleed: "start",
            },
          },
          {
            id: "link",
            label: { en: "Link", zh: "链接" },
            props: { children: save, href: "#" },
          },
          {
            id: "filter",
            label: { en: "Filter", zh: "筛选项" },
            props: {
              children: t({ en: "Watchlist", zh: "待看清单" }),
              size: "xs",
              look: "outline",
              isActive: true,
              trailing: "12",
            },
          },
          {
            id: "iconOnly",
            label: { en: "Icon only", zh: "纯图标" },
            props: {
              icon: "plus",
              "aria-label": t({ en: "Add item", zh: "添加项目" }),
            },
          },
          {
            id: "busy",
            label: { en: "Busy", zh: "忙碌" },
            props: {
              children: t({ en: "Saving", zh: "保存中" }),
              loading: true,
            },
          },
        ],
        controls: [
          "children",
          "look",
          "intent",
          "size",
          { prop: "icon", samples: labIconSamples },
          "trailing",
          "isActive",
          "loading",
          "bleed",
          "hideLabelOnMobile",
          "disabled",
        ],
      }}
    />
  );
}
