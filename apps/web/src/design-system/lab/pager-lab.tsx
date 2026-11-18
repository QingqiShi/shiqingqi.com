"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Pager } from "@tuja/ui/components/pager";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import pagerDoc from "#src/_generated/props/pager.json";
import { InertLink } from "./inert-link.tsx";
import { LabCanvas } from "./lab-canvas.tsx";

/**
 * A Pager fills its container, and the Canvas has no width to give it. Its
 * links keep the visitor on the Lab's page.
 */
function SizedPager(props: ComponentProps<typeof Pager>) {
  return (
    <div css={styles.frame}>
      <Pager {...props} linkComponent={InertLink} />
    </div>
  );
}

export function PagerLab() {
  const ariaLabel = t({ en: "Previous and next pages", zh: "上一页与下一页" });
  const previousLabel = t({ en: "Previous", zh: "上一页" });
  const nextLabel = t({ en: "Next", zh: "下一页" });

  const previous = {
    href: "/foundations/color",
    label: previousLabel,
    title: t({ en: "Colour", zh: "颜色" }),
  };

  const next = {
    href: "/foundations/typography",
    label: nextLabel,
    title: t({ en: "Typography", zh: "文字设计" }),
  };

  return (
    <LabCanvas
      config={{
        doc: pagerDoc,
        component: SizedPager,
        variants: [
          {
            id: "both",
            label: { en: "Both sides", zh: "两侧都有" },
            props: { "aria-label": ariaLabel, previous, next },
          },
          {
            id: "first",
            label: { en: "First page", zh: "第一页" },
            props: { "aria-label": ariaLabel, next },
          },
          {
            id: "last",
            label: { en: "Last page", zh: "最后一页" },
            props: { "aria-label": ariaLabel, previous },
          },
          {
            id: "long",
            label: { en: "Long titles", zh: "较长的标题" },
            props: {
              "aria-label": ariaLabel,
              previous: {
                href: "/foundations/color",
                label: previousLabel,
                title: t({
                  en: "Give each colour one meaning",
                  zh: "每种颜色只表达一种含义",
                }),
              },
              next: {
                href: "/foundations/typography",
                label: nextLabel,
                title: t({
                  en: "Set every line of text in a type role",
                  zh: "每一行文字都使用一个字体角色",
                }),
              },
            },
          },
        ],
        controls: ["aria-label"],
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
});
