"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import cardDoc from "#src/_generated/props/card.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

/** A card takes the width of its content, and the Canvas has no width to give it. */
function SizedCard(props: ComponentProps<typeof Card>) {
  return <Card {...props} css={styles.frame} />;
}

export function CardLab() {
  const typography = t({ en: "Typography", zh: "文字设计" });
  const typographyDescription = t({
    en: "Families, the type scale, weights, and heading and body styles.",
    zh: "字体、字号阶梯、字重，以及标题与正文样式。",
  });
  const monthlyReport = t({ en: "Monthly report", zh: "月度报告" });
  const updated = t({ en: "Updated 2 hours ago", zh: "2 小时前更新" });
  const inviteTeam = t({ en: "Invite your team", zh: "邀请你的团队" });

  const contentSamples: LabSample[] = [
    {
      id: "slots",
      label: { en: "Every slot", zh: "全部插槽" },
      value: labSource(
        <>
          <CardHeader action={<Badge>{t({ en: "New", zh: "新" })}</Badge>}>
            <CardTitle>{typography}</CardTitle>
            <CardDescription>{typographyDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text look="bodySmall" tone="muted">
              {t({
                en: "The blocks set no margin of their own. The card puts a gap between them.",
                zh: "各区块自身不设外边距，由卡片在它们之间留出间距。",
              })}
            </Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">{t({ en: "Open", zh: "打开" })}</Button>
            <Button size="sm" look="ghost">
              {t({ en: "Save", zh: "保存" })}
            </Button>
          </CardFooter>
        </>,
      ),
    },
    {
      id: "header",
      label: { en: "Title and description", zh: "标题与描述" },
      value: labSource(
        <CardHeader>
          <CardTitle>{typography}</CardTitle>
          <CardDescription>{typographyDescription}</CardDescription>
        </CardHeader>,
      ),
    },
    {
      id: "action",
      label: { en: "Header with an action", zh: "标题带操作" },
      value: labSource(
        <CardHeader
          action={
            <Button
              size="sm"
              look="ghost"
              icon={<DotsThreeIcon weight="bold" />}
              aria-label={t({ en: "More", zh: "更多" })}
            />
          }
        >
          <CardTitle>{monthlyReport}</CardTitle>
          <CardDescription>{updated}</CardDescription>
        </CardHeader>,
      ),
    },
    {
      id: "footer",
      label: { en: "Content and footer", zh: "内容与页脚" },
      value: labSource(
        <>
          <CardHeader>
            <CardTitle>{inviteTeam}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text look="bodySmall" tone="muted">
              {t({
                en: "Everyone you invite can view and edit this workspace.",
                zh: "你邀请的每个人都能查看和编辑这个工作区。",
              })}
            </Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">{t({ en: "Invite", zh: "邀请" })}</Button>
          </CardFooter>
        </>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: cardDoc,
        component: SizedCard,
        variants: [
          {
            id: "slots",
            label: { en: "Every slot", zh: "全部插槽" },
            props: { children: "slots" },
          },
          {
            id: "header",
            label: { en: "Title only", zh: "仅标题" },
            props: { children: "header" },
          },
          {
            id: "interactive",
            label: { en: "Interactive", zh: "可交互" },
            props: { children: "header", interactive: true },
          },
          {
            id: "action",
            label: { en: "With an action", zh: "带操作" },
            props: { children: "action" },
          },
          {
            id: "footer",
            label: { en: "With a footer", zh: "带页脚" },
            props: { children: "footer" },
          },
        ],
        controls: [
          { prop: "children", samples: contentSamples },
          "interactive",
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
