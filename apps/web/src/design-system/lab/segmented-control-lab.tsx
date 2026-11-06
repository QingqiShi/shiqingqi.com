"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import * as stylex from "@stylexjs/stylex";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import segmentedControlDoc from "#src/_generated/props/segmented-control.json";
import { defineLab } from "./define-lab.tsx";
import { iconNode } from "./lab-icon-samples.tsx";

type SegmentedControlLabProps = ComponentProps<typeof SegmentedControl<string>>;

/** A full-width track fills its container, and the Canvas has no width to give it. */
function SizedSegmentedControl(props: SegmentedControlLabProps) {
  return (
    <div css={styles.frame}>
      <SegmentedControl {...props} />
    </div>
  );
}

const TWO_VIEWS = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

const THREE_VIEWS = [...TWO_VIEWS, { value: "compact", label: "Compact" }];

const grid = iconNode("GridFourIcon", "GridFour", GridFourIcon);
const list = iconNode("ListIcon", "List", ListIcon);
const rows = iconNode("RowsIcon", "Rows", RowsIcon);

export const SegmentedControlLab = defineLab({
  doc: segmentedControlDoc,
  component: SizedSegmentedControl,
  variants: [
    {
      id: "two",
      label: { en: "Two views", zh: "两种视图" },
      props: { "aria-label": "View", value: "grid", options: TWO_VIEWS },
    },
    {
      id: "three",
      label: { en: "Three views", zh: "三种视图" },
      props: { "aria-label": "View", value: "list", options: THREE_VIEWS },
    },
    {
      id: "icons",
      label: { en: "With icons", zh: "带图标" },
      props: {
        "aria-label": "View",
        value: "grid",
        options: [
          { value: "grid", label: "Grid", icon: grid },
          { value: "list", label: "List", icon: list },
          { value: "compact", label: "Compact", icon: rows },
        ],
      },
    },
    {
      id: "icon-only",
      label: { en: "Icon-only", zh: "纯图标" },
      props: {
        "aria-label": "View",
        value: "grid",
        hideLabels: true,
        options: [
          { value: "grid", label: "Poster grid", icon: grid },
          { value: "table", label: "Table", icon: rows },
        ],
      },
    },
    {
      id: "full-width",
      label: { en: "Full width", zh: "撑满宽度" },
      props: {
        "aria-label": "View",
        value: "grid",
        fullWidth: true,
        options: THREE_VIEWS,
      },
    },
  ],
  controls: ["size", "fullWidth", "effect", "aria-label"],
  state: { prop: "value", handler: "onChange" },
});

const styles = stylex.create({
  frame: {
    display: "flex",
    justifyContent: "center",
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
