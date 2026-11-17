"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Select } from "@tuja/ui/components/select";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import selectDoc from "#src/_generated/props/select.json";
import { LabCanvas } from "./lab-canvas.tsx";

/** A field fills its container, and the Canvas has no width to give it. */
function SizedSelect(props: ComponentProps<typeof Select>) {
  // A native select reads its first value only when it mounts. Thus a new key
  // mounts it again when the placeholder comes or goes, or the options change.
  const key = [
    props.placeholder !== undefined,
    ...(props.options ?? []).map((option) => option.value),
  ].join();
  return (
    <div css={styles.frame}>
      <Select key={key} {...props} />
    </div>
  );
}

export function SelectLab() {
  const sortBy = t({ en: "Sort by", zh: "排序方式" });
  const sortOptions = [
    { value: "newest", label: t({ en: "Newest first", zh: "最新在前" }) },
    { value: "oldest", label: t({ en: "Oldest first", zh: "最早在前" }) },
    { value: "amount", label: t({ en: "Largest amount", zh: "金额最大" }) },
  ];

  return (
    <LabCanvas
      config={{
        doc: selectDoc,
        component: SizedSelect,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label: sortBy, options: sortOptions },
          },
          {
            id: "description",
            label: { en: "With a description", zh: "带说明" },
            props: {
              label: t({ en: "Plan", zh: "套餐" }),
              description: t({
                en: "A disabled option stays listed but can't be picked.",
                zh: "禁用的选项仍会列出，但无法被选择。",
              }),
              options: [
                { value: "free", label: t({ en: "Free", zh: "免费" }) },
                { value: "pro", label: t({ en: "Pro", zh: "专业版" }) },
                {
                  value: "enterprise",
                  label: t({ en: "Enterprise", zh: "企业版" }),
                  disabled: true,
                },
              ],
            },
          },
          {
            id: "placeholder",
            label: { en: "With a placeholder", zh: "带占位提示" },
            props: {
              label: t({ en: "Country", zh: "国家/地区" }),
              placeholder: t({
                en: "Choose a country",
                zh: "选择国家/地区",
              }),
              options: [
                {
                  value: "us",
                  label: t({ en: "United States", zh: "美国" }),
                },
                {
                  value: "gb",
                  label: t({ en: "United Kingdom", zh: "英国" }),
                },
              ],
            },
          },
          {
            id: "error",
            label: { en: "With an error", zh: "带错误" },
            props: {
              label: t({ en: "Rating", zh: "评级" }),
              placeholder: t({ en: "Choose a rating", zh: "选择评级" }),
              error: t({
                en: "Select a rating to continue.",
                zh: "请选择评级以继续。",
              }),
              options: [
                { value: "g", label: "G" },
                { value: "pg", label: "PG" },
                { value: "r", label: "R" },
              ],
            },
          },
          {
            id: "disabled",
            label: { en: "Disabled", zh: "禁用" },
            props: { label: sortBy, options: sortOptions, disabled: true },
          },
        ],
        controls: [
          "label",
          "placeholder",
          "description",
          "error",
          "size",
          "labelHidden",
          "disabled",
        ],
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
