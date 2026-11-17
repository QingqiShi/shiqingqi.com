"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import pageHeaderDoc from "#src/_generated/props/page-header.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const ACTIONS_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "add",
    label: { en: "One button", zh: "一个按钮" },
    value: labSource(
      <Button size="sm" look="outline" icon={<PlusIcon weight="bold" />}>
        Add
      </Button>,
    ),
  },
  {
    id: "exportAndAdd",
    label: { en: "Two buttons", zh: "两个按钮" },
    value: labSource(
      <>
        <Button
          size="sm"
          look="outline"
          icon={<DownloadSimpleIcon weight="bold" />}
        >
          Export
        </Button>
        <Button size="sm" look="outline" icon={<PlusIcon weight="bold" />}>
          Add
        </Button>
      </>,
    ),
  },
];

/** A header fills its container, and the Canvas has no width to give it. */
function SizedPageHeader(props: ComponentProps<typeof PageHeader>) {
  return <PageHeader {...props} css={styles.frame} />;
}

const DESCRIPTION =
  "What the household owns and owes, and whether each account still syncs.";

export const PageHeaderLab = defineLab({
  doc: pageHeaderDoc,
  component: SizedPageHeader,
  variants: [
    {
      id: "default",
      label: { en: "Title and description", zh: "标题与说明" },
      props: { title: "Accounts", description: DESCRIPTION },
    },
    {
      id: "actions",
      label: { en: "With actions", zh: "带操作" },
      props: {
        title: "Accounts",
        description: DESCRIPTION,
        actions: "exportAndAdd",
      },
    },
    {
      id: "eyebrow",
      label: { en: "With eyebrow", zh: "带眉题" },
      props: {
        eyebrow: "November 2026",
        title: "Monthly report",
        description: "Where the money went this month, by category.",
      },
    },
    {
      id: "small",
      label: { en: "Small", zh: "小号" },
      props: {
        size: "sm",
        title: "Accounts",
        description: "12 accounts, 2 need attention.",
        actions: "add",
      },
    },
  ],
  controls: [
    "title",
    "description",
    "eyebrow",
    { prop: "actions", samples: ACTIONS_SAMPLES },
    "size",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._16,
    maxInlineSize: "100%",
  },
});
