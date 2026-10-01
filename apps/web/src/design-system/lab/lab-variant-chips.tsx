"use client";

import * as stylex from "@stylexjs/stylex";
import { Chip } from "@tuja/ui/components/chip";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import type { LabVariantChoice } from "./types.ts";

interface LabVariantChipsProps {
  variants: readonly LabVariantChoice[];
  /** The Variant the props came from. */
  variantId: string;
  onSelect: (variantId: string) => void;
}

/**
 * The Variants as one radio group, shared by the controls panel and the Sheet:
 * a Variant is a whole configuration, so only one of them can be the selected
 * one.
 */
export function LabVariantChips({
  variants,
  variantId,
  onSelect,
}: LabVariantChipsProps) {
  const { getOptionProps } = useRadioGroup({
    values: variants.map((variant) => variant.id),
    value: variantId,
    onChange: onSelect,
  });

  return (
    <div
      role="radiogroup"
      aria-label={t({ en: "Variants", zh: "变体" })}
      css={styles.chips}
    >
      {variants.map((variant) => (
        <Chip
          key={variant.id}
          size="sm"
          isActive={variant.id === variantId}
          // `Chip` emits `aria-pressed` for its own selected state, which a
          // radio must not carry beside `aria-checked`.
          aria-pressed={undefined}
          {...getOptionProps(variant.id)}
        >
          {variant.label}
        </Chip>
      ))}
    </div>
  );
}

const styles = stylex.create({
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
  },
});
