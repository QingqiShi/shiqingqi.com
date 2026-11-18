"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import listRowDoc from "#src/_generated/props/list-row.json";
import { InertLink } from "./inert-link.tsx";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
import type { LabSample } from "./types.ts";

type ListRowLabProps = Extract<
  ComponentProps<typeof ListRow>,
  { href: string }
>;

function MoveButtons() {
  return (
    <>
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowUpIcon weight="bold" />}
        aria-label={t({ en: "Move up", zh: "上移" })}
      />
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowDownIcon weight="bold" />}
        aria-label={t({ en: "Move down", zh: "下移" })}
      />
    </>
  );
}

/**
 * A ListRow only draws its surface and dividers inside a List, so the Canvas
 * holds the row in one. The Lab's props go to the row.
 */
function ListedRow(props: ListRowLabProps) {
  return (
    <List aria-label={t({ en: "Settings", zh: "设置" })} css={styles.list}>
      <ListRow {...props} linkComponent={InertLink} />
    </List>
  );
}

const HREF = "/settings/rules";

export function ListLab() {
  const ada = t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" });
  const toReview = t({ en: "2 to review", zh: "2 项待审核" });
  const rules = t({ en: "Rules", zh: "规则" });
  const sortNew = t({ en: "Sort new transactions", zh: "为新交易分类" });
  const groceries = t({ en: "Groceries", zh: "日用杂货" });

  const leadingSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "avatar",
      label: { en: "Avatar", zh: "头像" },
      code: `<Avatar name="${ada}" size="sm" />`,
      imports: [{ name: "Avatar", from: "@tuja/ui/components/avatar" }],
      value: <Avatar name={ada} size="sm" />,
    },
    {
      id: "emoji",
      label: { en: "Emoji", zh: "表情符号" },
      code: '"🛒"',
      imports: [],
      value: "🛒",
    },
  ];

  const trailingSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "badge",
      label: { en: "Badge", zh: "徽标" },
      code: `<Badge intent="warning" size="sm">${toReview}</Badge>`,
      imports: [{ name: "Badge", from: "@tuja/ui/components/badge" }],
      value: (
        <Badge intent="warning" size="sm">
          {toReview}
        </Badge>
      ),
    },
  ];

  const actionsSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "move",
      label: { en: "Move up and down", zh: "上移与下移" },
      code: "<MoveButtons />",
      imports: [],
      value: <MoveButtons />,
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: listRowDoc,
        component: ListedRow,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { children: rules, detail: sortNew, href: HREF },
          },
          {
            id: "badge",
            label: { en: "With a Badge", zh: "带徽标" },
            props: {
              children: rules,
              detail: sortNew,
              trailing: "badge",
              href: HREF,
            },
          },
          {
            id: "person",
            label: { en: "Person", zh: "人员" },
            props: {
              children: ada,
              detail: t({ en: "Is owed", zh: "应收" }),
              leading: "avatar",
              leadingSize: "sm",
              value: "£42.50",
              href: HREF,
            },
          },
          {
            id: "title-only",
            label: { en: "Name and value", zh: "名称与数值" },
            props: {
              children: groceries,
              leading: "emoji",
              leadingShape: "circle",
              value: "-£42.10",
              valueDetail: "£755.41",
              href: HREF,
            },
          },
          {
            id: "more-lines",
            label: { en: "More lines", zh: "更多行" },
            props: {
              children: groceries,
              detail: t({ en: "Market Street · Card", zh: "市场街 · 银行卡" }),
              extra: t({
                en: "Shared with Alan Turing",
                zh: "与艾伦·图灵共同承担",
              }),
              leading: "emoji",
              leadingShape: "circle",
              value: "-£42.10",
              valueDetail: t({ en: "Your share £21.05", zh: "你承担 £21.05" }),
              href: HREF,
            },
          },
          {
            id: "wrap",
            label: { en: "Long name", zh: "较长的名称" },
            props: {
              children: "alex.morgan.very.long.address@example.com",
              detail: t({
                en: "Gmail · Last checked 4 Nov",
                zh: "Gmail · 上次检查于 11 月 4 日",
              }),
              leading: "avatar",
              wrap: true,
              href: HREF,
            },
          },
          {
            id: "selected",
            label: { en: "Selected", zh: "已选中" },
            props: {
              children: t({ en: "2026 report", zh: "2026 年报告" }),
              detail: t({ en: "Jan – Dec", zh: "1 月 – 12 月" }),
              "aria-current": true,
              caret: false,
              href: HREF,
            },
          },
          {
            id: "actions",
            label: { en: "With actions", zh: "带操作" },
            props: {
              children: t({ en: "Food and drink", zh: "餐饮" }),
              actions: "move",
              href: HREF,
            },
          },
        ],
        controls: [
          "children",
          "wrap",
          "detail",
          "extra",
          { prop: "leading", samples: leadingSamples },
          "leadingSize",
          "leadingShape",
          "value",
          "valueDetail",
          { prop: "trailing", samples: trailingSamples },
          { prop: "actions", samples: actionsSamples },
          "caret",
          { prop: "aria-current", kind: "boolean" },
        ],
      }}
    />
  );
}

const styles = stylex.create({
  list: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
