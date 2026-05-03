"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { GuideOptions } from "./utils/guides";

interface GuideControlsProps {
  guides: GuideOptions;
  onGuidesChange: (next: GuideOptions) => void;
}

export function GuideControls({ guides, onGuidesChange }: GuideControlsProps) {
  return (
    <fieldset css={styles.group}>
      <legend css={styles.legend}>{t({ en: "Guides", zh: "辅助线" })}</legend>
      <Toggle
        label={t({ en: "Halves", zh: "对半" })}
        checked={guides.halves}
        onChange={(checked) => {
          onGuidesChange({ ...guides, halves: checked });
        }}
        testId="guide-halves"
      />
      <Toggle
        label={t({ en: "Thirds", zh: "三等分" })}
        checked={guides.thirds}
        onChange={(checked) => {
          onGuidesChange({ ...guides, thirds: checked });
        }}
        testId="guide-thirds"
      />
      <Toggle
        label={t({ en: "Baseline", zh: "基线" })}
        checked={guides.baseline}
        onChange={(checked) => {
          onGuidesChange({ ...guides, baseline: checked });
        }}
        testId="guide-baseline"
      />
    </fieldset>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}

function Toggle({ label, checked, onChange, testId }: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} css={styles.toggle}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        data-testid={testId}
      />
      <span>{label}</span>
    </label>
  );
}

const styles = stylex.create({
  group: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._3,
    padding: space._3,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
    margin: 0,
  },
  legend: {
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  toggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    cursor: "pointer",
  },
});
