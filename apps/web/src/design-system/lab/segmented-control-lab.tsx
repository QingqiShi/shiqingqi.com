"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import segmentedControlDoc from "#src/_generated/props/segmented-control.json";
import { LabCanvas } from "./lab-canvas.tsx";
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

const grid = iconNode("GridFourIcon", "GridFour", GridFourIcon);
const list = iconNode("ListIcon", "List", ListIcon);
const rows = iconNode("RowsIcon", "Rows", RowsIcon);

export function SegmentedControlLab() {
  const view = t({ en: "View", zh: "视图" });
  const gridLabel = t({ en: "Grid", zh: "网格" });
  const listLabel = t({ en: "List", zh: "列表" });
  const compactLabel = t({ en: "Compact", zh: "紧凑" });

  const twoViews = [
    { value: "grid", label: gridLabel },
    { value: "list", label: listLabel },
  ];

  const threeViews = [...twoViews, { value: "compact", label: compactLabel }];

  return (
    <LabCanvas
      config={{
        doc: segmentedControlDoc,
        component: SizedSegmentedControl,
        variants: [
          {
            id: "two",
            label: { en: "Two views", zh: "两种视图" },
            props: { "aria-label": view, value: "grid", options: twoViews },
          },
          {
            id: "three",
            label: { en: "Three views", zh: "三种视图" },
            props: { "aria-label": view, value: "list", options: threeViews },
          },
          {
            id: "icons",
            label: { en: "With icons", zh: "带图标" },
            props: {
              "aria-label": view,
              value: "grid",
              options: [
                { value: "grid", label: gridLabel, icon: grid },
                { value: "list", label: listLabel, icon: list },
                { value: "compact", label: compactLabel, icon: rows },
              ],
            },
          },
          {
            id: "icon-only",
            label: { en: "Icon-only", zh: "纯图标" },
            props: {
              "aria-label": view,
              value: "grid",
              hideLabels: true,
              options: [
                {
                  value: "grid",
                  label: t({ en: "Poster grid", zh: "海报网格" }),
                  icon: grid,
                },
                {
                  value: "table",
                  label: t({ en: "Table", zh: "表格" }),
                  icon: rows,
                },
              ],
            },
          },
          {
            id: "full-width",
            label: { en: "Full width", zh: "撑满宽度" },
            props: {
              "aria-label": view,
              value: "grid",
              fullWidth: true,
              options: threeViews,
            },
          },
        ],
        controls: ["size", "fullWidth", "effect", "aria-label"],
        state: { prop: "value", handler: "onChange" },
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    display: "flex",
    justifyContent: "center",
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
