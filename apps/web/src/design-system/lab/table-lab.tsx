"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import tableDoc from "#src/_generated/props/table.json";
import { defineLab } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const ROWS_SAMPLES: LabSample[] = [
  {
    id: "plain",
    label: { en: "Text columns", zh: "文本列" },
    value: labSource(
      <>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Plan</TableHeaderCell>
            <TableHeaderCell scope="col">Repays above</TableHeaderCell>
            <TableHeaderCell scope="col">Written off</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell scope="row">Plan 1</TableHeaderCell>
            <TableCell>£26,065</TableCell>
            <TableCell>25 years</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
            <TableCell>£28,470</TableCell>
            <TableCell>30 years</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 5</TableHeaderCell>
            <TableCell>£25,000</TableCell>
            <TableCell>40 years</TableCell>
          </TableRow>
        </TableBody>
      </>,
    ),
  },
  {
    id: "numeric",
    label: { en: "Numeric columns", zh: "数字列" },
    value: labSource(
      <>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Plan</TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              Repays above
            </TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              Rate
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell scope="row">Plan 1</TableHeaderCell>
            <TableCell numeric>£26,065</TableCell>
            <TableCell numeric>9%</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 4</TableHeaderCell>
            <TableCell numeric>£32,745</TableCell>
            <TableCell numeric>9%</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Postgraduate</TableHeaderCell>
            <TableCell numeric>£21,000</TableCell>
            <TableCell numeric>6%</TableCell>
          </TableRow>
        </TableBody>
      </>,
    ),
  },
  {
    id: "current",
    label: { en: "A current row", zh: "当前行" },
    value: labSource(
      <>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Plan</TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              Repays above
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell scope="row">Plan 1</TableHeaderCell>
            <TableCell numeric>£26,065</TableCell>
          </TableRow>
          <TableRow current>
            <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
            <TableCell numeric>£28,470</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 5</TableHeaderCell>
            <TableCell numeric>£25,000</TableCell>
          </TableRow>
        </TableBody>
      </>,
    ),
  },
  {
    id: "foot",
    label: { en: "With a foot", zh: "带表尾" },
    value: labSource(
      <>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Plan</TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              Repays above
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell scope="row">Plan 1</TableHeaderCell>
            <TableCell numeric>£26,065</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
            <TableCell numeric>£28,470</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">Plan 4</TableHeaderCell>
            <TableCell numeric>£32,745</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot>
          <TableRow>
            <TableHeaderCell scope="row">Range</TableHeaderCell>
            <TableCell numeric>£26,065–£32,745</TableCell>
          </TableRow>
        </TableFoot>
      </>,
    ),
  },
];

/** A table fills its container, and the Canvas has no width to give it. */
function SizedTable(props: ComponentProps<typeof Table>) {
  return <Table {...props} containerCss={styles.frame} />;
}

const CAPTION = "Student loan repayment plans";

export const TableLab = defineLab({
  doc: tableDoc,
  component: SizedTable,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { caption: CAPTION, children: "plain" },
    },
    {
      id: "caption",
      label: { en: "Visible caption", zh: "显示标题" },
      props: { caption: CAPTION, captionVisible: true, children: "plain" },
    },
    {
      id: "numeric",
      label: { en: "Numeric columns", zh: "数字列" },
      props: { caption: CAPTION, children: "numeric" },
    },
    {
      id: "current",
      label: { en: "A current row", zh: "当前行" },
      props: { caption: CAPTION, children: "current" },
    },
    {
      id: "foot",
      label: { en: "With a foot", zh: "带表尾" },
      props: { caption: CAPTION, children: "foot" },
    },
  ],
  controls: [
    "caption",
    "captionVisible",
    { prop: "children", samples: ROWS_SAMPLES },
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
});
