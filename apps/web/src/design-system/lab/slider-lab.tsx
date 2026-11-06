"use client";

import * as stylex from "@stylexjs/stylex";
import { Slider } from "@tuja/ui/components/slider";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import sliderDoc from "#src/_generated/props/slider.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import type { LabSample } from "./types.ts";

type SliderLabProps = ComponentProps<typeof Slider>;

// A sample holds a fixed node, but these readouts show the value at each step.
// Thus each sample holds a marker, and the Specimen puts the value in its place.
const VALUE_READOUT = <></>;
const PERCENT_READOUT = <></>;

const READOUT_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "value",
    label: { en: "The value", zh: "当前值" },
    code: "value",
    imports: [],
    value: VALUE_READOUT,
  },
  {
    id: "percent",
    label: { en: "A percentage", zh: "百分比" },
    code: "`${value}%`",
    imports: [],
    value: PERCENT_READOUT,
  },
];

/** A field fills its container, and the Canvas has no width to give it. */
function SizedSlider(props: SliderLabProps) {
  const { readout, value } = props;
  const shown =
    readout === VALUE_READOUT
      ? value
      : readout === PERCENT_READOUT
        ? `${String(value)}%`
        : readout;
  return (
    <div css={styles.frame}>
      <Slider {...props} readout={shown} />
    </div>
  );
}

export const SliderLab = defineLab({
  doc: sliderDoc,
  component: SizedSlider,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: "Volume", value: 40, readout: "value" },
    },
    {
      id: "description",
      label: { en: "With a description", zh: "带说明" },
      props: {
        label: "Opacity",
        description: "How much of the layer below shows through.",
        value: 80,
        readout: "percent",
      },
    },
    {
      id: "steps",
      label: { en: "Whole steps", zh: "整数步进" },
      props: {
        label: "Risk level",
        description: "1 is the most careful.",
        min: 1,
        max: 5,
        value: 3,
        readout: "value",
      },
    },
    {
      id: "error",
      label: { en: "With an error", zh: "带错误" },
      props: {
        label: "Deposit",
        value: 5,
        readout: "percent",
        error: "Put down at least 10%.",
      },
    },
    {
      id: "disabled",
      label: { en: "Disabled", zh: "禁用" },
      props: { label: "Volume", value: 40, readout: "value", disabled: true },
    },
  ],
  controls: [
    "label",
    "description",
    "error",
    { prop: "value", range: { min: 0, max: 100 } },
    { prop: "min", range: { min: 0, max: 50 } },
    { prop: "max", range: { min: 5, max: 100 } },
    { prop: "step", range: { min: 1, max: 25 } },
    { prop: "readout", samples: READOUT_SAMPLES },
    "size",
    "labelHidden",
    "disabled",
  ],
  state: { prop: "value", handler: "onChange" },
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
