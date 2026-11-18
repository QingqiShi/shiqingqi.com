"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import pageHeaderDoc from "#src/_generated/props/page-header.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

/** A header fills its container, and the Canvas has no width to give it. */
function SizedPageHeader(props: ComponentProps<typeof PageHeader>) {
  return <PageHeader {...props} css={styles.frame} />;
}

export function PageHeaderLab() {
  const accounts = t({ en: "Accounts", zh: "账户" });
  const description = t({
    en: "What the household owns and owes, and whether each account still syncs.",
    zh: "家庭拥有和欠下的一切，以及每个账户是否仍在同步。",
  });
  const actionsSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "add",
      label: { en: "One button", zh: "一个按钮" },
      value: labSource(
        <Button size="sm" look="outline" icon={<PlusIcon weight="bold" />}>
          {t({ en: "Add", zh: "添加" })}
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
            {t({ en: "Export", zh: "导出" })}
          </Button>
          <Button size="sm" look="outline" icon={<PlusIcon weight="bold" />}>
            {t({ en: "Add", zh: "添加" })}
          </Button>
        </>,
      ),
    },
  ];
  return (
    <LabCanvas
      config={{
        doc: pageHeaderDoc,
        component: SizedPageHeader,
        variants: [
          {
            id: "default",
            label: { en: "Title and description", zh: "标题与说明" },
            props: { title: accounts, description },
          },
          {
            id: "actions",
            label: { en: "With actions", zh: "带操作" },
            props: {
              title: accounts,
              description,
              actions: "exportAndAdd",
            },
          },
          {
            id: "eyebrow",
            label: { en: "With eyebrow", zh: "带眉题" },
            props: {
              eyebrow: t({ en: "November 2026", zh: "2026 年 11 月" }),
              title: t({ en: "Monthly report", zh: "月度报告" }),
              description: t({
                en: "Where the money went this month, by category.",
                zh: "本月的钱按类别花在了哪里。",
              }),
            },
          },
          {
            id: "small",
            label: { en: "Small", zh: "小号" },
            props: {
              size: "sm",
              title: accounts,
              description: t({
                en: "12 accounts, 2 need attention.",
                zh: "12 个账户，2 个需要处理。",
              }),
              actions: "add",
            },
          },
        ],
        controls: [
          "title",
          "description",
          "eyebrow",
          { prop: "actions", samples: actionsSamples },
          "size",
        ],
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: space._16,
    maxInlineSize: "100%",
  },
});
