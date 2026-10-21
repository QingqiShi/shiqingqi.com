"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Chip } from "@tuja/ui/components/chip";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { Switch } from "@tuja/ui/components/switch";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";

/**
 * One row for each `controlHeight` step, holding every control that takes
 * that step. `e2e/design-system-control-height.spec.ts` measures these rows.
 */
export function ControlHeightSpecimen() {
  const [range, setRange] = useState("week");
  const chipLabel = t({ en: "Chip", zh: "标签" });
  const buttonLabel = t({ en: "Button", zh: "按钮" });
  const nameLabel = t({ en: "Name", zh: "名称" });
  const noteLabel = t({ en: "Note", zh: "备注" });
  const sortLabel = t({ en: "Sort", zh: "排序" });
  const rangeLabel = t({ en: "Range", zh: "范围" });
  const notifyLabel = t({ en: "Notify me", zh: "通知我" });
  const rangeOptions = [
    { value: "week", label: t({ en: "Week", zh: "周" }) },
    { value: "month", label: t({ en: "Month", zh: "月" }) },
  ];
  const sortOptions = [
    { value: "new", label: t({ en: "Newest", zh: "最新" }) },
    { value: "old", label: t({ en: "Oldest", zh: "最早" }) },
  ];

  const row = (step: "xs" | "sm" | "md" | "lg", controls: ReactNode) => (
    <div key={step} css={stack.tight}>
      <code css={[typeRole.caption, styles.step]}>
        {`size="${step}" · controlHeight.${step}`}
      </code>
      <div data-control-step={step} css={cluster.tight}>
        {controls}
      </div>
    </div>
  );

  return (
    <div css={stack.item}>
      {row("xs", <Chip size="xs">{chipLabel}</Chip>)}
      {(["sm", "md", "lg"] as const).map((step) =>
        row(
          step,
          <>
            {step === "sm" ? <Chip size="sm">{chipLabel}</Chip> : null}
            <Button size={step}>{buttonLabel}</Button>
            <TextField
              size={step}
              label={nameLabel}
              labelHidden
              placeholder={nameLabel}
              css={styles.field}
            />
            <Select
              size={step}
              label={sortLabel}
              labelHidden
              options={sortOptions}
              defaultValue="new"
            />
            {step === "lg" ? null : (
              <SegmentedControl
                size={step}
                aria-label={rangeLabel}
                options={rangeOptions}
                value={range}
                onChange={setRange}
              />
            )}
            <Switch size={step} aria-label={notifyLabel} />
            <Textarea
              size={step}
              label={noteLabel}
              labelHidden
              placeholder={noteLabel}
              rows={1}
              css={styles.field}
            />
          </>,
        ),
      )}
    </div>
  );
}

const styles = stylex.create({
  step: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  field: {
    inlineSize: "10rem",
  },
});
