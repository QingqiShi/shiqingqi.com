"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import menuButtonDoc from "#src/_generated/props/menu-button.json";
import { defineLab } from "./define-lab.tsx";
import { iconNode } from "./lab-icon-samples.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const menu = stylex.create({
  list: {
    padding: controlSize._1,
    inlineSize: space._13,
  },
});

const panel = stylex.create({
  controls: {
    padding: space._2,
    inlineSize: space._13,
  },
});

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "items",
    label: { en: "Menu items", zh: "菜单项" },
    value: labSource(
      <div role="none" css={[flex.col, menu.list]}>
        <MenuItem>Details</MenuItem>
        <MenuItem>Cast & crew</MenuItem>
        <MenuItem>Similar</MenuItem>
      </div>,
    ),
  },
  {
    id: "controls",
    label: { en: "Controls", zh: "控件" },
    value: labSource(
      <div css={[stack.tight, panel.controls]}>
        <MenuLabel>Sort by</MenuLabel>
        <Button look="primary">Newest</Button>
        <Button>Popular</Button>
      </div>,
    ),
  },
];

const DOTS_ICON = iconNode("DotsThreeIcon", "DotsThree", DotsThreeIcon);

export const MenuButtonLab = defineLab({
  doc: menuButtonDoc,
  component: MenuButton,
  variants: [
    {
      id: "menu",
      label: { en: "Menu", zh: "菜单" },
      props: {
        children: "More",
        buttonProps: { icon: DOTS_ICON },
        menuContent: "items",
      },
    },
    {
      id: "group",
      label: { en: "Controls", zh: "控件" },
      props: {
        children: "Filters",
        buttonProps: {
          icon: iconNode("FunnelIcon", "Funnel", FunnelIcon),
        },
        menuContent: "controls",
        popupRole: "group",
      },
    },
    {
      id: "icon",
      label: { en: "Icon only", zh: "仅图标" },
      props: {
        buttonProps: { icon: DOTS_ICON, "aria-label": "More" },
        menuContent: "items",
      },
    },
    {
      id: "disabled",
      label: { en: "Disabled", zh: "禁用" },
      props: {
        children: "More",
        buttonProps: { icon: DOTS_ICON },
        menuContent: "items",
        disabled: true,
      },
    },
  ],
  controls: [
    "children",
    { prop: "menuContent", samples: CONTENT_SAMPLES },
    "position",
    "popupRole",
    "disabled",
  ],
});
