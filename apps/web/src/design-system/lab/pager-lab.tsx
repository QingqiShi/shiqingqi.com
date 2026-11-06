"use client";

import * as stylex from "@stylexjs/stylex";
import { Pager } from "@tuja/ui/components/pager";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import pagerDoc from "#src/_generated/props/pager.json";
import { defineLab, InertLink } from "./define-lab.tsx";

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

const PREVIOUS = {
  href: "/foundations/color",
  label: "Previous",
  title: "Colour",
};

const NEXT = {
  href: "/foundations/typography",
  label: "Next",
  title: "Typography",
};

export const PagerLab = defineLab({
  doc: pagerDoc,
  component: SizedPager,
  variants: [
    {
      id: "both",
      label: { en: "Both sides", zh: "两侧都有" },
      props: {
        "aria-label": "Previous and next pages",
        previous: PREVIOUS,
        next: NEXT,
      },
    },
    {
      id: "first",
      label: { en: "First page", zh: "第一页" },
      props: { "aria-label": "Previous and next pages", next: NEXT },
    },
    {
      id: "last",
      label: { en: "Last page", zh: "最后一页" },
      props: { "aria-label": "Previous and next pages", previous: PREVIOUS },
    },
    {
      id: "long",
      label: { en: "Long titles", zh: "较长的标题" },
      props: {
        "aria-label": "Previous and next pages",
        previous: {
          href: "/foundations/color",
          label: "Previous",
          title: "Give each colour one meaning",
        },
        next: {
          href: "/foundations/typography",
          label: "Next",
          title: "Set every line of text in a type role",
        },
      },
    },
  ],
  controls: ["aria-label"],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
});
