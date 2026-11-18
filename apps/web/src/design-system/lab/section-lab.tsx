"use client";

import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Button } from "@tuja/ui/components/button";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import sectionDoc from "#src/_generated/props/section.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { iconSample } from "./lab-icon-samples.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
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

/** A section fills its container, and the Canvas has no width to give it. */
function SizedSection(props: ComponentProps<typeof Section>) {
  return <Section {...props} css={styles.frame} />;
}

export function SectionLab() {
  const castTitle = t({ en: "Cast & crew", zh: "演职人员" });
  const castDescription = t({
    en: "Twelve credited roles, four of them uncredited on release.",
    zh: "十二个署名角色，其中四个在上映时未署名。",
  });

  const actionsSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "seeAll",
      label: { en: "See all", zh: "查看全部" },
      value: labSource(
        <Button look="outline" size="xs" href="#">
          {t({ en: "See all", zh: "查看全部" })}
        </Button>,
      ),
    },
  ];

  const contentSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "people",
      label: { en: "Avatars", zh: "头像" },
      value: labSource(
        <div css={cluster.item}>
          <Avatar name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })} />
          <Avatar name={t({ en: "Alan Turing", zh: "艾伦·图灵" })} />
          <Avatar name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })} />
        </div>,
      ),
    },
    {
      id: "text",
      label: { en: "Text", zh: "文本" },
      value: labSource(
        <Text look="bodySmall">
          {t({
            en: "Four of the roles went uncredited on release and were added later.",
            zh: "其中四个角色在上映时未署名，后来才补上。",
          })}
        </Text>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: sectionDoc,
        component: SizedSection,
        variants: [
          {
            id: "anatomy",
            label: { en: "Title and icon", zh: "标题与图标" },
            props: {
              title: castTitle,
              description: castDescription,
              icon: "users",
            },
          },
          {
            id: "actions",
            label: { en: "With actions", zh: "带操作" },
            props: {
              title: t({ en: "Similar titles", zh: "相似作品" }),
              description: t({
                en: "Picked from the same genre and decade.",
                zh: "选自同一类型、同一年代。",
              }),
              icon: "film",
              actions: "seeAll",
            },
          },
          {
            id: "content",
            label: { en: "With content", zh: "带内容" },
            props: {
              title: castTitle,
              description: castDescription,
              icon: "users",
              children: "people",
            },
          },
          {
            id: "divided",
            label: { en: "Divided", zh: "带分隔" },
            props: {
              title: castTitle,
              description: castDescription,
              divider: true,
              children: "text",
            },
          },
        ],
        controls: [
          "title",
          "description",
          { prop: "icon", samples: ICON_SAMPLES },
          { prop: "actions", samples: actionsSamples },
          { prop: "children", samples: contentSamples },
          "level",
          "divider",
        ],
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
