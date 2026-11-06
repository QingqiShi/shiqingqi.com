"use client";

import * as stylex from "@stylexjs/stylex";
import { Divider } from "@tuja/ui/components/divider";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import dividerDoc from "#src/_generated/props/divider.json";
import { defineLab } from "./define-lab.tsx";

/**
 * A Divider takes the full length of its container, and the Canvas has no
 * length to give it, so the Lab holds it in a box of a set size.
 */
function FramedDivider(props: ComponentProps<typeof Divider>) {
  return (
    <div
      css={
        props.orientation === "vertical" ? styles.vertical : styles.horizontal
      }
    >
      <Divider {...props} />
    </div>
  );
}

export const DividerLab = defineLab({
  doc: dividerDoc,
  component: FramedDivider,
  variants: [
    {
      id: "subtle",
      label: { en: "Subtle", zh: "柔和" },
      props: {},
    },
    {
      id: "bold",
      label: { en: "Bold", zh: "强烈" },
      props: { look: "bold" },
    },
    {
      id: "decorative",
      label: { en: "Decorative", zh: "装饰" },
      props: { look: "decorative" },
    },
    {
      id: "vertical",
      label: { en: "Vertical", zh: "垂直" },
      props: { orientation: "vertical" },
    },
  ],
  controls: ["orientation", "look"],
});

const styles = stylex.create({
  horizontal: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
  vertical: {
    display: "flex",
    blockSize: space._11,
  },
});
