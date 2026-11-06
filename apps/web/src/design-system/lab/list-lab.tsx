"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import listRowDoc from "#src/_generated/props/list-row.json";
import { defineLab, InertLink, NONE_SAMPLE } from "./define-lab.tsx";
import type { LabSample } from "./types.ts";

type ListRowLabProps = Extract<
  ComponentProps<typeof ListRow>,
  { href: string }
>;

const LEADING_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "avatar",
    label: { en: "Avatar", zh: "头像" },
    code: '<Avatar name="Ada Lovelace" size="sm" />',
    imports: [{ name: "Avatar", from: "@tuja/ui/components/avatar" }],
    value: <Avatar name="Ada Lovelace" size="sm" />,
  },
  {
    id: "emoji",
    label: { en: "Emoji", zh: "表情符号" },
    code: '"🛒"',
    imports: [],
    value: "🛒",
  },
];

const TRAILING_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "badge",
    label: { en: "Badge", zh: "徽标" },
    code: '<Badge intent="warning" size="sm">2 to review</Badge>',
    imports: [{ name: "Badge", from: "@tuja/ui/components/badge" }],
    value: (
      <Badge intent="warning" size="sm">
        2 to review
      </Badge>
    ),
  },
];

function MoveButtons() {
  return (
    <>
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowUpIcon weight="bold" />}
        aria-label="Move up"
      />
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowDownIcon weight="bold" />}
        aria-label="Move down"
      />
    </>
  );
}

const ACTIONS_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "move",
    label: { en: "Move up and down", zh: "上移与下移" },
    code: "<MoveButtons />",
    imports: [],
    value: <MoveButtons />,
  },
];

/**
 * A ListRow only draws its surface and dividers inside a List, so the Canvas
 * holds the row in one. The Lab's props go to the row.
 */
function ListedRow(props: ListRowLabProps) {
  return (
    <List aria-label="Settings" css={styles.list}>
      <ListRow {...props} linkComponent={InertLink} />
    </List>
  );
}

const HREF = "/settings/rules";

export const ListLab = defineLab({
  doc: listRowDoc,
  component: ListedRow,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: "Rules", detail: "Sort new transactions", href: HREF },
    },
    {
      id: "badge",
      label: { en: "With a Badge", zh: "带徽标" },
      props: {
        children: "Rules",
        detail: "Sort new transactions",
        trailing: "badge",
        href: HREF,
      },
    },
    {
      id: "person",
      label: { en: "Person", zh: "人员" },
      props: {
        children: "Ada Lovelace",
        detail: "Is owed",
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
        children: "Groceries",
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
        children: "Groceries",
        detail: "Market Street · Card",
        extra: "Shared with Alan Turing",
        leading: "emoji",
        leadingShape: "circle",
        value: "-£42.10",
        valueDetail: "Your share £21.05",
        href: HREF,
      },
    },
    {
      id: "wrap",
      label: { en: "Long name", zh: "较长的名称" },
      props: {
        children: "alex.morgan.very.long.address@example.com",
        detail: "Gmail · Last checked 4 Nov",
        leading: "avatar",
        wrap: true,
        href: HREF,
      },
    },
    {
      id: "selected",
      label: { en: "Selected", zh: "已选中" },
      props: {
        children: "2026 report",
        detail: "Jan – Dec",
        "aria-current": true,
        caret: false,
        href: HREF,
      },
    },
    {
      id: "actions",
      label: { en: "With actions", zh: "带操作" },
      props: { children: "Food and drink", actions: "move", href: HREF },
    },
  ],
  controls: [
    "children",
    "wrap",
    "detail",
    "extra",
    { prop: "leading", samples: LEADING_SAMPLES },
    "leadingSize",
    "leadingShape",
    "value",
    "valueDetail",
    { prop: "trailing", samples: TRAILING_SAMPLES },
    { prop: "actions", samples: ACTIONS_SAMPLES },
    "caret",
    { prop: "aria-current", kind: "boolean" },
  ],
});

const styles = stylex.create({
  list: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
