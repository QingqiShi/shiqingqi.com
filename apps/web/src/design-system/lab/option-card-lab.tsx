"use client";

import { HeadsetIcon } from "@phosphor-icons/react/dist/ssr/Headset";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldIcon } from "@phosphor-icons/react/dist/ssr/Shield";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { OptionCardGroup } from "@tuja/ui/components/option-card-group";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import optionCardGroupDoc from "#src/_generated/props/option-card-group.json";
import { defineLab } from "./define-lab.tsx";
import { iconNode } from "./lab-icon-samples.tsx";

type OptionCardGroupLabProps = ComponentProps<typeof OptionCardGroup<string>>;

/** A group fills its container, and the Canvas has no width to give it. */
function SizedOptionCardGroup(props: OptionCardGroupLabProps) {
  return (
    <div css={styles.frame}>
      <OptionCardGroup {...props} />
    </div>
  );
}

const PLANS = [
  {
    value: "free",
    label: "Free",
    description: "One project and community support.",
  },
  {
    value: "pro",
    label: "Pro",
    description: "Unlimited projects and daily backups.",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Single sign-on, an audit log, and a named contact.",
  },
];

export const OptionCardLab = defineLab({
  doc: optionCardGroupDoc,
  component: SizedOptionCardGroup,
  variants: [
    {
      id: "single",
      label: { en: "Single selection", zh: "单选" },
      props: { "aria-label": "Plan", value: "pro", options: PLANS },
    },
    {
      id: "multiple",
      label: { en: "Multiple selection", zh: "多选" },
      props: {
        "aria-label": "Add-ons",
        selection: "multiple",
        value: ["support"],
        options: [
          {
            value: "support",
            label: "Priority support",
            description: "A reply within one working day.",
            icon: iconNode("HeadsetIcon", "Headset", HeadsetIcon),
          },
          {
            value: "seats",
            label: "Extra seats",
            description: "Five more people on the same workspace.",
            icon: iconNode("UsersThreeIcon", "UsersThree", UsersThreeIcon),
          },
          {
            value: "audit",
            label: "Audit log",
            description: "Every change, kept for two years.",
            icon: iconNode("ShieldIcon", "Shield", ShieldIcon),
          },
        ],
      },
    },
    {
      id: "tile",
      label: { en: "Tiles", zh: "平铺" },
      props: {
        "aria-label": "Delivery",
        look: "tile",
        value: "express",
        options: [
          {
            value: "standard",
            label: "Standard",
            icon: iconNode("PackageIcon", "Package", PackageIcon),
          },
          {
            value: "express",
            label: "Express",
            icon: iconNode("LightningIcon", "Lightning", LightningIcon),
          },
          {
            value: "sameDay",
            label: "Same day",
            icon: iconNode(
              "RocketLaunchIcon",
              "RocketLaunch",
              RocketLaunchIcon,
            ),
          },
        ],
      },
    },
    {
      id: "disabled",
      label: { en: "A disabled card", zh: "禁用一张卡片" },
      props: {
        "aria-label": "Plan",
        value: "free",
        options: PLANS.map((plan) =>
          plan.value === "enterprise" ? { ...plan, disabled: true } : plan,
        ),
      },
    },
  ],
  controls: ["look", "aria-label"],
  state: { prop: "value", handler: "onChange" },
});

const styles = stylex.create({
  frame: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
});
