"use client";

import * as stylex from "@stylexjs/stylex";
import { Select } from "@tuja/ui/components/select";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import selectDoc from "#src/_generated/props/select.json";
import { defineLab } from "./define-lab.tsx";

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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount", label: "Largest amount" },
];

export const SelectLab = defineLab({
  doc: selectDoc,
  component: SizedSelect,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: "Sort by", options: SORT_OPTIONS },
    },
    {
      id: "description",
      label: { en: "With a description", zh: "带说明" },
      props: {
        label: "Plan",
        description: "A disabled option stays listed but can't be picked.",
        options: [
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "enterprise", label: "Enterprise", disabled: true },
        ],
      },
    },
    {
      id: "placeholder",
      label: { en: "With a placeholder", zh: "带占位提示" },
      props: {
        label: "Country",
        placeholder: "Choose a country",
        options: [
          { value: "us", label: "United States" },
          { value: "gb", label: "United Kingdom" },
        ],
      },
    },
    {
      id: "error",
      label: { en: "With an error", zh: "带错误" },
      props: {
        label: "Rating",
        placeholder: "Choose a rating",
        error: "Select a rating to continue.",
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
      props: { label: "Sort by", options: SORT_OPTIONS, disabled: true },
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
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
