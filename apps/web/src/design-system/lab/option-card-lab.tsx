"use client";

import { HeadsetIcon } from "@phosphor-icons/react/dist/ssr/Headset";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldIcon } from "@phosphor-icons/react/dist/ssr/Shield";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { OptionCardGroup } from "@tuja/ui/components/option-card-group";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import optionCardGroupDoc from "#src/_generated/props/option-card-group.json";
import { LabCanvas } from "./lab-canvas.tsx";
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

export function OptionCardLab() {
  const plan = t({ en: "Plan", zh: "套餐" });

  const plans = [
    {
      value: "free",
      label: t({ en: "Free", zh: "免费" }),
      description: t({
        en: "One project and community support.",
        zh: "一个项目，社区支持。",
      }),
    },
    {
      value: "pro",
      label: t({ en: "Pro", zh: "专业版" }),
      description: t({
        en: "Unlimited projects and daily backups.",
        zh: "项目数量不限，每日备份。",
      }),
    },
    {
      value: "enterprise",
      label: t({ en: "Enterprise", zh: "企业版" }),
      description: t({
        en: "Single sign-on, an audit log, and a named contact.",
        zh: "单点登录、审计日志，并配备专属联系人。",
      }),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: optionCardGroupDoc,
        component: SizedOptionCardGroup,
        variants: [
          {
            id: "single",
            label: { en: "Single selection", zh: "单选" },
            props: { "aria-label": plan, value: "pro", options: plans },
          },
          {
            id: "multiple",
            label: { en: "Multiple selection", zh: "多选" },
            props: {
              "aria-label": t({ en: "Add-ons", zh: "附加服务" }),
              selection: "multiple",
              value: ["support"],
              options: [
                {
                  value: "support",
                  label: t({ en: "Priority support", zh: "优先支持" }),
                  description: t({
                    en: "A reply within one working day.",
                    zh: "一个工作日内回复。",
                  }),
                  icon: iconNode("HeadsetIcon", "Headset", HeadsetIcon),
                },
                {
                  value: "seats",
                  label: t({ en: "Extra seats", zh: "增加席位" }),
                  description: t({
                    en: "Five more people on the same workspace.",
                    zh: "同一工作空间再增加五人。",
                  }),
                  icon: iconNode(
                    "UsersThreeIcon",
                    "UsersThree",
                    UsersThreeIcon,
                  ),
                },
                {
                  value: "audit",
                  label: t({ en: "Audit log", zh: "审计日志" }),
                  description: t({
                    en: "Every change, kept for two years.",
                    zh: "记录每一次变更，保留两年。",
                  }),
                  icon: iconNode("ShieldIcon", "Shield", ShieldIcon),
                },
              ],
            },
          },
          {
            id: "tile",
            label: { en: "Tiles", zh: "平铺" },
            props: {
              "aria-label": t({ en: "Delivery", zh: "配送方式" }),
              look: "tile",
              value: "express",
              options: [
                {
                  value: "standard",
                  label: t({ en: "Standard", zh: "标准" }),
                  icon: iconNode("PackageIcon", "Package", PackageIcon),
                },
                {
                  value: "express",
                  label: t({ en: "Express", zh: "加急" }),
                  icon: iconNode("LightningIcon", "Lightning", LightningIcon),
                },
                {
                  value: "sameDay",
                  label: t({ en: "Same day", zh: "当日达" }),
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
              "aria-label": plan,
              value: "free",
              options: plans.map((option) =>
                option.value === "enterprise"
                  ? { ...option, disabled: true }
                  : option,
              ),
            },
          },
        ],
        controls: ["look", "aria-label"],
        state: { prop: "value", handler: "onChange" },
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
