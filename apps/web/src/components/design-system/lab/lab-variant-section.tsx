"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { labEyebrow } from "./lab-eyebrow.stylex.ts";
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
    <section css={styles.section}>
      <Text as="span" look="caption" tone="subtle" css={labEyebrow.base}>
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

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
});
