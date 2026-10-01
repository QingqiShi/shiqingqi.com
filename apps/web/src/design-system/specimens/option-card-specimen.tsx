import * as stylex from "@stylexjs/stylex";
import { OptionCard } from "@tuja/ui/components/option-card";
import { font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two rows, the first chosen — the smallest arrangement in which the accent ring
 * and the filled dot read as a choice rather than as a lone card.
 *
 * A plain `role="radiogroup"` wrapper rather than `OptionCardGroup`, which is
 * controlled by contract and would need an `onChange` a server component cannot
 * hand it. The plate is inert, so nothing can pick a card either way.
 *
 * The `css` override tightens the cards to specimen scale, using the same escape
 * hatch the component documents.
 */
export function OptionCardSpecimen() {
  return (
    <div
      role="radiogroup"
      aria-label={t({ en: "Plan", zh: "套餐" })}
      css={[specimenLayout.fill, styles.group]}
    >
      <OptionCard
        role="radio"
        selected
        label={t({ en: "Pro", zh: "专业版" })}
        css={styles.card}
      />
      <OptionCard
        role="radio"
        label={t({ en: "Free", zh: "免费" })}
        css={styles.card}
      />
    </div>
  );
}

const styles = stylex.create({
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  card: {
    paddingBlock: space._1,
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
  },
});
