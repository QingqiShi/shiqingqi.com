"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { cluster } from "@tuja/ui/primitives/stack.stylex";

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
      css={cluster.tight}
    >
      {variants.map((variant) => (
        <Button
          look="outline"
          key={variant.id}
          size="xs"
          isActive={variant.id === variantId}
          // `Button` emits `aria-pressed` for its own selected state, which a
          // radio must not carry beside `aria-checked`.
          aria-pressed={undefined}
          {...getOptionProps(variant.id)}
        >
          {variant.label}
        </Button>
      ))}
    </div>
  );
}
