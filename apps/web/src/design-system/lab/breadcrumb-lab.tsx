"use client";

import { Breadcrumb } from "@tuja/ui/components/breadcrumb";
import type { ComponentProps } from "react";
import breadcrumbDoc from "#src/_generated/props/breadcrumb.json";
import { defineLab, InertLink, NONE_SAMPLE } from "./define-lab.tsx";
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

export const BreadcrumbLab = defineLab({
  doc: breadcrumbDoc,
  component: InertBreadcrumb,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: {
        label: "Breadcrumb",
        items: [
          { label: "Home", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "Rules" },
        ],
      },
    },
    {
      id: "grouping",
      label: { en: "A level with no page", zh: "无页面的层级" },
      props: {
        label: "Breadcrumb",
        items: [
          { label: "Home", href: "/" },
          { label: "Design system", href: "/design-system" },
          { label: "Components" },
          { label: "Breadcrumb" },
        ],
      },
    },
    {
      id: "slash",
      label: { en: "Slash separator", zh: "斜杠分隔符" },
      props: {
        label: "Breadcrumb",
        separator: "slash",
        items: [
          { label: "Home", href: "/" },
          { label: "Reports", href: "/reports" },
          { label: "2026" },
        ],
      },
    },
    {
      id: "long",
      label: { en: "A long trail", zh: "较长的路径" },
      props: {
        label: "Breadcrumb",
        items: [
          { label: "Home", href: "/" },
          { label: "Design system", href: "/design-system" },
          { label: "Components", href: "/design-system/components" },
          { label: "Actions" },
          { label: "Breadcrumb" },
        ],
      },
    },
  ],
  controls: ["label", { prop: "separator", samples: SEPARATOR_SAMPLES }],
});
