"use client";

import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import type { GuideOptions } from "./utils/guides";

interface GuideControlsProps {
  guides: GuideOptions;
  onGuidesChange: (next: GuideOptions) => void;
}

export function GuideControls({ guides, onGuidesChange }: GuideControlsProps) {
  return (
    <section css={styles.group}>
      <h3 css={styles.sectionLabel}>{t({ en: "Guides", zh: "辅助线" })}</h3>
      <div css={styles.toggles}>
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
      </div>
    </section>
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
    <label htmlFor={id} css={[styles.toggle, checked && styles.toggleChecked]}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        css={styles.checkbox}
        data-testid={testId}
      />
      <span>{label}</span>
    </label>
  );
}

const styles = stylex.create({
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    margin: 0,
    padding: 0,
    border: "none",
  },
  sectionLabel: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
  },
  toggles: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
  },
  toggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._0,
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
    backgroundColor: color.bgSurfaceSunken,
    borderRadius: border.radius_round,
    cursor: "pointer",
  },
  toggleChecked: {
    color: color.textMain,
    backgroundColor: color.surfaceAccentSubtle,
  },
  checkbox: {
    accentColor: color.accent,
    cursor: "pointer",
  },
});
