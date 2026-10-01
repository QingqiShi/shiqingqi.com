"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { Slider } from "@tuja/ui/components/slider";
import { Switch } from "@tuja/ui/components/switch";
import { TextField } from "@tuja/ui/components/text-field";
import { t } from "#src/i18n.ts";
import type { LabControlModel, LabProps } from "./types.ts";
import { unquote } from "./unquote.ts";

interface LabControlProps {
  control: LabControlModel;
  /**
   * Every prop in play, so a control the visitor has not touched shows the
   * component's own default rather than an empty box.
   */
  props: LabProps;
  onChange: (value: unknown) => void;
}

/** Past this many options the track is too tight to read, so the list becomes a Select. */
const MAX_SEGMENTS = 4;

/** The option value that stands for a prop left out altogether. */
const OMITTED = "";

/**
 * One prop's control, picked from the prop's kind. The prop name is the
 * control's accessible name, so the panel and the mobile bar can each frame it
 * however they like without the control losing its name.
 */
export function LabControl({ control, props, onChange }: LabControlProps) {
  const { name, kind, members, defaultValue, samples } = control;
  const raw = props[name];

  if (samples !== undefined) {
    const value = typeof raw === "string" ? raw : (samples[0]?.id ?? OMITTED);
    return (
      <Select
        size="sm"
        label={name}
        labelHidden
        value={value}
        options={samples.map((sample) => ({
          value: sample.id,
          label: sample.label,
        }))}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  }

  if (kind === "enum") {
    // A prop with no default is omitted until the visitor picks a value, so
    // the list needs an option that means exactly that.
    const options = [
      ...(defaultValue === undefined
        ? [{ value: OMITTED, label: t({ en: "Default", zh: "默认" }) }]
        : []),
      ...(members ?? []).map((member) => ({ value: member, label: member })),
    ];
    const value =
      typeof raw === "string" ? raw : (unquote(defaultValue) ?? OMITTED);
    const select = (next: string) => {
      onChange(next === OMITTED ? undefined : next);
    };
    if (options.length <= MAX_SEGMENTS) {
      return (
        <SegmentedControl
          size="sm"
          fullWidth
          aria-label={name}
          value={value}
          options={options}
          onChange={select}
        />
      );
    }
    return (
      <Select
        size="sm"
        label={name}
        labelHidden
        value={value}
        options={options}
        onChange={(event) => {
          select(event.target.value);
        }}
      />
    );
  }

  if (kind === "boolean") {
    return (
      <Switch
        size="sm"
        aria-label={name}
        value={raw === true ? "on" : "off"}
        onChange={(state) => {
          onChange(state === "on");
        }}
      />
    );
  }

  if (kind === "number") {
    const value =
      typeof raw === "number" ? raw : Number(unquote(defaultValue) ?? 0);
    return (
      <Slider
        size="sm"
        label={name}
        labelHidden
        readout={value}
        value={value}
        onChange={onChange}
        onCommit={onChange}
      />
    );
  }

  return (
    <TextField
      size="sm"
      label={name}
      labelHidden
      value={typeof raw === "string" ? raw : ""}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
