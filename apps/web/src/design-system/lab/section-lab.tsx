"use client";

import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Button } from "@tuja/ui/components/button";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import sectionDoc from "#src/_generated/props/section.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { iconSample } from "./lab-icon-samples.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const ICON_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  iconSample(
    "users",
    { en: "People", zh: "人物" },
    "UsersIcon",
    "Users",
    UsersIcon,
  ),
  iconSample(
    "film",
    { en: "Film slate", zh: "场记板" },
    "FilmSlateIcon",
    "FilmSlate",
    FilmSlateIcon,
  ),
];

const ACTIONS_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "seeAll",
    label: { en: "See all", zh: "查看全部" },
    value: labSource(
      <Button look="outline" size="xs" href="#">
        See all
      </Button>,
    ),
  },
];

const CONTENT_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "people",
    label: { en: "Avatars", zh: "头像" },
    value: labSource(
      <div css={cluster.item}>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Alan Turing" />
        <Avatar name="Grace Hopper" />
      </div>,
    ),
  },
  {
    id: "text",
    label: { en: "Text", zh: "文本" },
    value: labSource(
      <Text look="bodySmall">
        Four of the roles went uncredited on release and were added later.
      </Text>,
    ),
  },
];

/** A section fills its container, and the Canvas has no width to give it. */
function SizedSection(props: ComponentProps<typeof Section>) {
  return <Section {...props} css={styles.frame} />;
}

const CAST_DESCRIPTION =
  "Twelve credited roles, four of them uncredited on release.";

export const SectionLab = defineLab({
  doc: sectionDoc,
  component: SizedSection,
  variants: [
    {
      id: "anatomy",
      label: { en: "Title and icon", zh: "标题与图标" },
      props: {
        title: "Cast & crew",
        description: CAST_DESCRIPTION,
        icon: "users",
      },
    },
    {
      id: "actions",
      label: { en: "With actions", zh: "带操作" },
      props: {
        title: "Similar titles",
        description: "Picked from the same genre and decade.",
        icon: "film",
        actions: "seeAll",
      },
    },
    {
      id: "content",
      label: { en: "With content", zh: "带内容" },
      props: {
        title: "Cast & crew",
        description: CAST_DESCRIPTION,
        icon: "users",
        children: "people",
      },
    },
    {
      id: "divided",
      label: { en: "Divided", zh: "带分隔" },
      props: {
        title: "Cast & crew",
        description: CAST_DESCRIPTION,
        divider: true,
        children: "text",
      },
    },
  ],
  controls: [
    "title",
    "description",
    { prop: "icon", samples: ICON_SAMPLES },
    { prop: "actions", samples: ACTIONS_SAMPLES },
    { prop: "children", samples: CONTENT_SAMPLES },
    "level",
    "divider",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
});
