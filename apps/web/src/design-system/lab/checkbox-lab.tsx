"use client";

import { t } from "@tuja/i18n";
import { Checkbox } from "@tuja/ui/components/checkbox";
import checkboxDoc from "#src/_generated/props/checkbox.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function CheckboxLab() {
  const label = t({
    en: "Email me about product updates",
    zh: "向我发送产品更新邮件",
  });
  const passport = t({ en: "Renew passport", zh: "续签护照" });

  return (
    <LabCanvas
      config={{
        doc: checkboxDoc,
        component: Checkbox,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label },
          },
          {
            id: "description",
            label: { en: "With a description", zh: "带说明" },
            props: {
              label,
              description: t({
                en: "One email a month, and never more.",
                zh: "每月一封，绝不多发。",
              }),
            },
          },
          {
            id: "indeterminate",
            label: { en: "Indeterminate", zh: "部分选中" },
            props: {
              label: t({ en: "Select all", zh: "全选" }),
              indeterminate: true,
            },
          },
          {
            id: "error",
            label: { en: "With an error", zh: "带错误" },
            props: {
              label: t({ en: "Accept the terms", zh: "接受条款" }),
              error: t({
                en: "You must accept the terms to continue.",
                zh: "必须接受条款才能继续。",
              }),
            },
          },
          {
            id: "done",
            label: { en: "Done", zh: "已完成" },
            props: { label: passport, look: "done" },
          },
          {
            id: "selection",
            label: { en: "Selection", zh: "选择" },
            props: {
              label: t({ en: "Select this item", zh: "选择此条目" }),
              look: "selection",
            },
          },
          {
            id: "readOnly",
            label: { en: "Read-only", zh: "只读" },
            props: { label: passport, readOnly: true },
          },
          {
            id: "small",
            label: { en: "Small", zh: "小号" },
            props: { label, size: "sm" },
          },
          {
            id: "disabled",
            label: { en: "Disabled", zh: "禁用" },
            props: { label, disabled: true },
          },
        ],
        controls: [
          "label",
          "description",
          "error",
          "look",
          "size",
          "indeterminate",
          "readOnly",
          "labelHidden",
          "disabled",
        ],
      }}
    />
  );
}
