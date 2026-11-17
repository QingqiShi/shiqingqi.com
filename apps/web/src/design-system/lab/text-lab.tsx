"use client";

import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import textDoc from "#src/_generated/props/text.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function TextLab() {
  const copy = t({
    en: "Your report is ready to download.",
    zh: "你的报告已可以下载。",
  });

  return (
    <LabCanvas
      config={{
        doc: textDoc,
        component: Text,
        variants: [
          {
            id: "body",
            label: { en: "Body", zh: "正文" },
            props: { children: copy },
          },
          {
            id: "muted",
            label: { en: "Muted", zh: "弱化" },
            props: { children: copy, look: "bodySmall", tone: "muted" },
          },
          {
            id: "label",
            label: { en: "Label", zh: "标签" },
            props: {
              children: t({ en: "Account name", zh: "账户名称" }),
              look: "label",
              weight: "medium",
            },
          },
          {
            id: "caption",
            label: { en: "Caption", zh: "说明文字" },
            props: {
              children: t({ en: "Updated 2 minutes ago", zh: "2 分钟前更新" }),
              look: "caption",
            },
          },
          {
            id: "overline",
            label: { en: "Overline", zh: "上标题" },
            props: {
              children: t({ en: "New feature", zh: "新功能" }),
              look: "overline",
              tone: "primary",
            },
          },
          {
            id: "verbatim",
            label: { en: "Verbatim", zh: "原样显示" },
            props: {
              children: t({
                en: "Step (1): cut 2x3 -> glue",
                zh: "第 (1) 步：裁 2x3 -> 粘",
              }),
              verbatim: true,
            },
          },
          {
            id: "lines",
            label: { en: "Two lines", zh: "两行" },
            props: {
              children: t({
                en: "A weary detective takes one last case that drags his own past back into the light, and the city he swore to protect turns out to have kept his secrets better than he did.",
                zh: "一位疲惫的警探接下最后一桩案子，却让自己的过往重见天日；而他发誓守护的城市，竟比他自己更好地守住了他的秘密。",
              }),
              look: "bodySmall",
              tone: "muted",
              lines: 2,
            },
          },
        ],
        controls: [
          "children",
          "look",
          "tone",
          "weight",
          "transform",
          "as",
          "verbatim",
          { prop: "lines", range: { min: 1, max: 5 } },
          "measure",
        ],
      }}
    />
  );
}
