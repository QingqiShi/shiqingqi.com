"use client";

import { t } from "@tuja/i18n";
import { Breadcrumb } from "@tuja/ui/components/breadcrumb";
import type { ComponentProps } from "react";
import breadcrumbDoc from "#src/_generated/props/breadcrumb.json";
import { InertLink } from "./inert-link.tsx";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
import type { LabSample } from "./types.ts";

const SEPARATOR_SAMPLES: LabSample[] = [
  { ...NONE_SAMPLE, label: { en: "Chevron", zh: "尖角箭头" } },
  {
    id: "slash",
    label: { en: "Slash", zh: "斜杠" },
    code: '"/"',
    imports: [],
    value: "/",
  },
  {
    id: "dot",
    label: { en: "Dot", zh: "圆点" },
    code: '"·"',
    imports: [],
    value: "·",
  },
];

/** A crumb is a link, and the Lab keeps the visitor on its page. */
function InertBreadcrumb(props: ComponentProps<typeof Breadcrumb>) {
  return <Breadcrumb {...props} linkComponent={InertLink} />;
}

export function BreadcrumbLab() {
  const breadcrumb = t({ en: "Breadcrumb", zh: "面包屑导航" });
  const home = t({ en: "Home", zh: "首页" });
  const designSystem = t({ en: "Design system", zh: "设计系统" });
  const components = t({ en: "Components", zh: "组件" });

  return (
    <LabCanvas
      config={{
        doc: breadcrumbDoc,
        component: InertBreadcrumb,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: {
              label: breadcrumb,
              items: [
                { label: home, href: "/" },
                { label: t({ en: "Settings", zh: "设置" }), href: "/settings" },
                { label: t({ en: "Rules", zh: "规则" }) },
              ],
            },
          },
          {
            id: "grouping",
            label: { en: "A level with no page", zh: "无页面的层级" },
            props: {
              label: breadcrumb,
              items: [
                { label: home, href: "/" },
                { label: designSystem, href: "/design-system" },
                { label: components },
                { label: breadcrumb },
              ],
            },
          },
          {
            id: "slash",
            label: { en: "Slash separator", zh: "斜杠分隔符" },
            props: {
              label: breadcrumb,
              separator: "slash",
              items: [
                { label: home, href: "/" },
                { label: t({ en: "Reports", zh: "报告" }), href: "/reports" },
                { label: "2026" },
              ],
            },
          },
          {
            id: "long",
            label: { en: "A long trail", zh: "较长的路径" },
            props: {
              label: breadcrumb,
              items: [
                { label: home, href: "/" },
                { label: designSystem, href: "/design-system" },
                { label: components, href: "/design-system/components" },
                { label: t({ en: "Actions", zh: "操作控件" }) },
                { label: breadcrumb },
              ],
            },
          },
        ],
        controls: ["label", { prop: "separator", samples: SEPARATOR_SAMPLES }],
      }}
    />
  );
}
