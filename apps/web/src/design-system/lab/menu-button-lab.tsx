"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, space } from "@tuja/ui/tokens.stylex";
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
  item: {
    blockSize: controlSize._9,
    paddingInline: controlSize._3,
    fontWeight: font.weight_6,
    textAlign: "start",
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
      <div role="none" css={[stack.text, menu.list]}>
        <button
          type="button"
          role="menuitem"
          css={[
            buttonReset.base,
            corner.radius_1,
            typeRole.control,
            quietSurface.interactive,
            a11y.focusRing,
            menu.item,
          ]}
        >
          Details
        </button>
        <button
          type="button"
          role="menuitem"
          css={[
            buttonReset.base,
            corner.radius_1,
            typeRole.control,
            quietSurface.interactive,
            a11y.focusRing,
            menu.item,
          ]}
        >
          Cast & crew
        </button>
        <button
          type="button"
          role="menuitem"
          css={[
            buttonReset.base,
            corner.radius_1,
            typeRole.control,
            quietSurface.interactive,
            a11y.focusRing,
            menu.item,
          ]}
        >
          Similar
        </button>
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
