"use client";

import { SuitcaseIcon } from "@phosphor-icons/react/dist/ssr/Suitcase";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import disclosureDoc from "#src/_generated/props/disclosure.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { iconSample } from "./lab-icon-samples.tsx";
import type { LabSample } from "./types.ts";

const ICON_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  iconSample(
    "suitcase",
    { en: "Suitcase", zh: "行李箱" },
    "SuitcaseIcon",
    "Suitcase",
    SuitcaseIcon,
  ),
];

const TRAILING_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "badge",
    label: { en: "Badge", zh: "徽标" },
    code: '<Badge intent="neutral">2/5</Badge>',
    imports: [{ name: "Badge", from: "@tuja/ui/components/badge" }],
    value: <Badge intent="neutral">2/5</Badge>,
  },
];

/**
 * `defaultOpen` sets only the first state, so the Lab mounts the Disclosure
 * again when it changes. The visitor can still open and close the panel, and
 * the snippet shows the uncontrolled API a reader can paste.
 */
function ResettableDisclosure(props: ComponentProps<typeof Disclosure>) {
  return (
    <div css={styles.frame}>
      <Disclosure key={String(props.defaultOpen)} {...props} />
    </div>
  );
}

const SUMMARY = "Packing list";
const PANEL = "Passport, charger, and a rain jacket.";

export const DisclosureLab = defineLab({
  doc: disclosureDoc,
  component: ResettableDisclosure,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { summary: SUMMARY, children: PANEL },
    },
    {
      id: "card",
      label: { en: "Card", zh: "卡片" },
      props: { summary: SUMMARY, children: PANEL, look: "card" },
    },
    {
      id: "open",
      label: { en: "Open", zh: "展开" },
      props: {
        summary: SUMMARY,
        children: PANEL,
        look: "card",
        defaultOpen: true,
      },
    },
    {
      id: "icon-and-count",
      label: { en: "With an icon and a count", zh: "带图标与计数" },
      props: {
        summary: SUMMARY,
        children: PANEL,
        look: "card",
        icon: "suitcase",
        trailing: "badge",
      },
    },
  ],
  controls: [
    "summary",
    "children",
    "look",
    { prop: "icon", samples: ICON_SAMPLES },
    { prop: "trailing", samples: TRAILING_SAMPLES },
    "defaultOpen",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
