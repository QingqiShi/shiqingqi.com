"use client";

import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";

import { t } from "#src/i18n.ts";
import { LabVariantChips } from "./lab-variant-chips.tsx";
import type { LabVariantChoice } from "./types.ts";

interface LabVariantSectionProps {
  variants: readonly LabVariantChoice[];
  /** The Variant the props came from. */
  variantId: string;
  onSelect: (variantId: string) => void;
}

/** The Variants under their heading, as the panel and the Sheet both show them. */
export function LabVariantSection({
  variants,
  variantId,
  onSelect,
}: LabVariantSectionProps) {
  return (
    <section css={stack.tight}>
      <Text as="span" look="caption" tone="muted" css={typeRole.overline}>
        {t({ en: "Variants", zh: "变体" })}
      </Text>
      <LabVariantChips
        variants={variants}
        variantId={variantId}
        onSelect={onSelect}
      />
    </section>
  );
}
