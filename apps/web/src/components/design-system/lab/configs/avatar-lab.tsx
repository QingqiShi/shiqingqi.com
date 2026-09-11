"use client";

import { AirplaneTakeoffIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTakeoff";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Avatar } from "@tuja/ui/components/avatar";
import type { ComponentProps } from "react";
import avatarDoc from "#src/_generated/props/avatar.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig, LabSample } from "../types.ts";
import { iconSample } from "./lab-icon-samples.tsx";

type AvatarLabProps = ComponentProps<typeof Avatar>;

const BADGE_SAMPLES: LabSample[] = [
  {
    id: "none",
    label: { en: "None", zh: "无" },
    code: "",
    imports: [],
    value: undefined,
  },
  iconSample(
    "departing",
    { en: "Departing", zh: "出发" },
    "AirplaneTakeoffIcon",
    "AirplaneTakeoff",
    <AirplaneTakeoffIcon />,
  ),
  iconSample(
    "confirmed",
    { en: "Confirmed", zh: "已确认" },
    "CheckIcon",
    "Check",
    <CheckIcon />,
  ),
];

// A drawn stand-in, not a real photo. The data URI keeps the specimen
// self-contained, with no asset file and no network call.
const PORTRAIT =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20fill='%236f5aa8'/%3E%3Ccircle%20cx='32'%20cy='25'%20r='11'%20fill='%23f0ecf7'/%3E%3Cpath%20d='M8%2064c0-14%2011-22%2024-22s24%208%2024%2022z'%20fill='%23f0ecf7'/%3E%3C/svg%3E";

// The name a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const NAME = "Ada Lovelace";

const config: LabConfig<AvatarLabProps> = {
  component: "avatar",
  element: "Avatar",
  importPath: "@tuja/ui/components/avatar",
  propsDoc: avatarDoc,
  render: (props) => <Avatar {...props} />,
  variants: [
    {
      id: "monogramSm",
      label: { en: "Monogram sm", zh: "字母缩写 sm" },
      props: { name: NAME, size: "sm" },
    },
    {
      id: "monogramMd",
      label: { en: "Monogram md", zh: "字母缩写 md" },
      props: { name: NAME, size: "md" },
    },
    {
      id: "monogramLg",
      label: { en: "Monogram lg", zh: "字母缩写 lg" },
      props: { name: NAME, size: "lg" },
    },
    {
      id: "portraitSm",
      label: { en: "Portrait sm", zh: "头像图片 sm" },
      props: { name: NAME, src: PORTRAIT, size: "sm" },
    },
    {
      id: "portraitMd",
      label: { en: "Portrait md", zh: "头像图片 md" },
      props: { name: NAME, src: PORTRAIT, size: "md" },
    },
    {
      id: "portraitLg",
      label: { en: "Portrait lg", zh: "头像图片 lg" },
      props: { name: NAME, src: PORTRAIT, size: "lg" },
    },
    {
      id: "solidSm",
      label: { en: "Solid sm", zh: "实心 sm" },
      props: { name: NAME, look: "solid", size: "sm" },
    },
    {
      id: "solidMd",
      label: { en: "Solid md", zh: "实心 md" },
      props: { name: NAME, look: "solid", size: "md" },
    },
    {
      id: "solidLg",
      label: { en: "Solid lg", zh: "实心 lg" },
      props: { name: NAME, look: "solid", size: "lg" },
    },
  ],
  controls: [
    "name",
    "look",
    "size",
    "initials",
    { prop: "badge", samples: BADGE_SAMPLES },
    "badgeLabel",
  ],
};

/** The Avatar Lab: a live Avatar on the Canvas, with its API beside it. */
export function AvatarLab() {
  return <LabCanvas config={config} />;
}
