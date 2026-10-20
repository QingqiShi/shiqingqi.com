"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow, type ListRowLinkProps } from "@tuja/ui/components/list-row";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import listRowDoc from "#src/_generated/props/list-row.json";
import { LabCanvas } from "./lab-canvas.tsx";
import type { LabConfig, LabSample } from "./types.ts";

type ListRowLabProps = Extract<
  ComponentProps<typeof ListRow>,
  { href: string }
>;

const NONE: LabSample = {
  id: "none",
  label: { en: "None", zh: "无" },
  code: "",
  imports: [],
  value: undefined,
};

const LEADING_SAMPLES: LabSample[] = [
  NONE,
  {
    id: "avatar",
    label: { en: "Avatar", zh: "头像" },
    code: '<Avatar name="Ada Lovelace" size="sm" />',
    imports: [{ name: "Avatar", from: "@tuja/ui/components/avatar" }],
    value: <Avatar name="Ada Lovelace" size="sm" />,
  },
];

const TRAILING_SAMPLES: LabSample[] = [
  NONE,
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
  {
    id: "amount",
    label: { en: "Amount", zh: "金额" },
    code: '"£42.50"',
    imports: [],
    value: "£42.50",
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
  NONE,
  {
    id: "move",
    label: { en: "Move up and down", zh: "上移与下移" },
    code: "<MoveButtons />",
    imports: [],
    value: <MoveButtons />,
  },
];

/** Keeps the Lab on its page when the visitor follows the row. */
function InertLink({ onClick, ...props }: ListRowLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  );
}

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

const config: LabConfig<ListRowLabProps> = {
  component: "list-row",
  element: "ListRow",
  importPath: "@tuja/ui/components/list-row",
  propsDoc: listRowDoc,
  render: (props) => <ListedRow {...props} />,
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
        trailing: "amount",
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
    "detail",
    { prop: "leading", samples: LEADING_SAMPLES },
    { prop: "trailing", samples: TRAILING_SAMPLES },
    { prop: "actions", samples: ACTIONS_SAMPLES },
    "caret",
    { prop: "aria-current", kind: "boolean" },
  ],
};

/** The List Lab: a live ListRow in a List on the Canvas, with its API beside it. */
export function ListLab() {
  return <LabCanvas config={config} />;
}

const styles = stylex.create({
  list: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
