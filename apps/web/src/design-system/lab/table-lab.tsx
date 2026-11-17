"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
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
import { LabCanvas } from "./lab-canvas.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

/** A table fills its container, and the Canvas has no width to give it. */
function SizedTable(props: ComponentProps<typeof Table>) {
  return <Table {...props} containerCss={styles.frame} />;
}

export function TableLab() {
  const caption = t({
    en: "Student loan repayment plans",
    zh: "学生贷款还款计划",
  });
  const plan = t({ en: "Plan", zh: "还款计划" });
  const repaysAbove = t({ en: "Repays above", zh: "起征点" });
  const plan1 = t({ en: "Plan 1", zh: "计划 1" });
  const plan2 = t({ en: "Plan 2", zh: "计划 2" });
  const plan4 = t({ en: "Plan 4", zh: "计划 4" });
  const plan5 = t({ en: "Plan 5", zh: "计划 5" });

  const rowsSamples: LabSample[] = [
    {
      id: "plain",
      label: { en: "Text columns", zh: "文本列" },
      value: labSource(
        <>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">{plan}</TableHeaderCell>
              <TableHeaderCell scope="col">{repaysAbove}</TableHeaderCell>
              <TableHeaderCell scope="col">
                {t({ en: "Written off", zh: "免除年限" })}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="row">{plan1}</TableHeaderCell>
              <TableCell>£26,065</TableCell>
              <TableCell>{t({ en: "25 years", zh: "25 年" })}</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan2}</TableHeaderCell>
              <TableCell>£28,470</TableCell>
              <TableCell>{t({ en: "30 years", zh: "30 年" })}</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan5}</TableHeaderCell>
              <TableCell>£25,000</TableCell>
              <TableCell>{t({ en: "40 years", zh: "40 年" })}</TableCell>
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
              <TableHeaderCell scope="col">{plan}</TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {repaysAbove}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Rate", zh: "还款比例" })}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="row">{plan1}</TableHeaderCell>
              <TableCell numeric>£26,065</TableCell>
              <TableCell numeric>9%</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan4}</TableHeaderCell>
              <TableCell numeric>£32,745</TableCell>
              <TableCell numeric>9%</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">
                {t({ en: "Postgraduate", zh: "研究生贷款" })}
              </TableHeaderCell>
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
              <TableHeaderCell scope="col">{plan}</TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {repaysAbove}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="row">{plan1}</TableHeaderCell>
              <TableCell numeric>£26,065</TableCell>
            </TableRow>
            <TableRow current>
              <TableHeaderCell scope="row">{plan2}</TableHeaderCell>
              <TableCell numeric>£28,470</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan5}</TableHeaderCell>
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
              <TableHeaderCell scope="col">{plan}</TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {repaysAbove}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="row">{plan1}</TableHeaderCell>
              <TableCell numeric>£26,065</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan2}</TableHeaderCell>
              <TableCell numeric>£28,470</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{plan4}</TableHeaderCell>
              <TableCell numeric>£32,745</TableCell>
            </TableRow>
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableHeaderCell scope="row">
                {t({ en: "Range", zh: "范围" })}
              </TableHeaderCell>
              <TableCell numeric>£26,065–£32,745</TableCell>
            </TableRow>
          </TableFoot>
        </>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: tableDoc,
        component: SizedTable,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { caption: caption, children: "plain" },
          },
          {
            id: "caption",
            label: { en: "Visible caption", zh: "显示标题" },
            props: {
              caption: caption,
              captionVisible: true,
              children: "plain",
            },
          },
          {
            id: "numeric",
            label: { en: "Numeric columns", zh: "数字列" },
            props: { caption: caption, children: "numeric" },
          },
          {
            id: "current",
            label: { en: "A current row", zh: "当前行" },
            props: { caption: caption, children: "current" },
          },
          {
            id: "foot",
            label: { en: "With a foot", zh: "带表尾" },
            props: { caption: caption, children: "foot" },
          },
        ],
        controls: [
          "caption",
          "captionVisible",
          { prop: "children", samples: rowsSamples },
        ],
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
