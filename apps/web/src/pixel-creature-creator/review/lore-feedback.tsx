"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Textarea } from "@tuja/ui/components/textarea";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { actionRowStyles } from "./action-row.stylex";
import type { LoreData } from "./creature-card";
import type { LoreFetchState } from "./use-lore-conjuring";

interface LoreFeedbackProps {
  loreFetch: LoreFetchState;
  lore: LoreData | null;
  manualLore: string;
  onManualLoreChange: (text: string) => void;
  onManualLoreSubmit: () => void;
}

export function LoreFeedback({
  loreFetch,
  lore,
  manualLore,
  onManualLoreChange,
  onManualLoreSubmit,
}: LoreFeedbackProps) {
  const labels = {
    loreError: t({
      en: "Lore conjuring failed. You can write your own below.",
      zh: "传说召唤失败,你可以在下方手写一段。",
    }),
    rateLimited: t({
      en: "Slow down — try again in a minute.",
      zh: "稍等片刻,请一分钟后再试。",
    }),
    manualLabel: t({ en: "Write your own lore", zh: "手写传说" }),
    manualPlaceholder: t({
      en: "Type a sentence about your creature…",
      zh: "为你的生物写一句话…",
    }),
    manualSubmit: t({ en: "Save lore", zh: "保存传说" }),
  };
  const showManualFallback = loreFetch.kind === "error" && lore === null;

  return (
    <>
      {loreFetch.kind === "error" && (
        <p
          role="status"
          css={[
            typeRole.bodySmall,
            corner.radius_2,
            actionRowStyles.ephemeral,
            actionRowStyles.ephemeralError,
          ]}
          data-testid="lore-error"
          data-reason={loreFetch.reason}
        >
          {loreFetch.reason === "rate_limited"
            ? labels.rateLimited
            : labels.loreError}
        </p>
      )}

      {showManualFallback && (
        <div
          css={[corner.radius_2, styles.manualFallback]}
          data-testid="lore-manual"
        >
          <Textarea
            label={labels.manualLabel}
            value={manualLore}
            onChange={(event) => {
              onManualLoreChange(event.target.value);
            }}
            placeholder={labels.manualPlaceholder}
            rows={3}
            maxLength={200}
            data-testid="lore-manual-input"
          />
          <button
            type="button"
            css={[
              buttonReset.base,
              typeRole.label,
              corner.radius_round,
              actionRowStyles.button,
              actionRowStyles.buttonPrimary,
              transition.colors,
            ]}
            onClick={onManualLoreSubmit}
            disabled={manualLore.trim().length === 0}
            data-testid="lore-manual-submit"
          >
            {labels.manualSubmit}
          </button>
        </div>
      )}
    </>
  );
}

const styles = stylex.create({
  manualFallback: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurface,
    alignSelf: "center",
    inlineSize: "100%",
    maxInlineSize: "32rem",
  },
});
