"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
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
import { defineLab } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "slots",
    label: { en: "Every slot", zh: "全部插槽" },
    value: labSource(
      <>
        <CardHeader action={<Badge>New</Badge>}>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Families, the type scale, weights, and heading and body styles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Text look="bodySmall" tone="muted">
            The blocks set no margin of their own. The card puts a gap between
            them.
          </Text>
        </CardContent>
        <CardFooter>
          <Button size="sm">Open</Button>
          <Button size="sm" look="ghost">
            Save
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
        <CardTitle>Typography</CardTitle>
        <CardDescription>
          Families, the type scale, weights, and heading and body styles.
        </CardDescription>
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
            aria-label="More"
          />
        }
      >
        <CardTitle>Monthly report</CardTitle>
        <CardDescription>Updated 2 hours ago</CardDescription>
      </CardHeader>,
    ),
  },
  {
    id: "footer",
    label: { en: "Content and footer", zh: "内容与页脚" },
    value: labSource(
      <>
        <CardHeader>
          <CardTitle>Invite your team</CardTitle>
        </CardHeader>
        <CardContent>
          <Text look="bodySmall" tone="muted">
            Everyone you invite can view and edit this workspace.
          </Text>
        </CardContent>
        <CardFooter>
          <Button size="sm">Invite</Button>
        </CardFooter>
      </>,
    ),
  },
];

/** A card takes the width of its content, and the Canvas has no width to give it. */
function SizedCard(props: ComponentProps<typeof Card>) {
  return <Card {...props} css={styles.frame} />;
}

export const CardLab = defineLab({
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
  controls: [{ prop: "children", samples: CONTENT_SAMPLES }, "interactive"],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
