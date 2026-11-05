"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { copyTextToClipboard } from "@tuja/ui/utils/copy-text-to-clipboard";
import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  CreatureDef,
  Emotion,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { encodeCreature } from "#src/pixel-creature-creator/creature/encode-creature.ts";
import { isCreatureSaved } from "#src/pixel-creature-creator/creature/is-creature-saved.ts";
import { notifySavedCreaturesChanged } from "#src/pixel-creature-creator/creature/notify-saved-creatures-changed.ts";
import { saveCreature } from "#src/pixel-creature-creator/creature/saved-creatures/save-creature.ts";
import { subscribeSavedCreatures } from "#src/pixel-creature-creator/creature/subscribe-saved-creatures.ts";
import { randomCreature } from "#src/pixel-creature-creator/wizard/random-creature.ts";
import { actionRowStyles } from "./action-row.stylex";
import type { LoreData } from "./creature-card";
import { DownloadMenu } from "./download-menu";
import { LoreFeedback } from "./lore-feedback";
import { useLoreConjuring } from "./use-lore-conjuring";

interface ActionRowProps {
  def: CreatureDef;
  emotion: Emotion;
  lore: LoreData | null;
  onLoreChange: (lore: LoreData | null) => void;
  encodedHash: string;
}

interface EphemeralState {
  kind: "copied" | "error";
  message: string;
}

const EPHEMERAL_TIMEOUT_MS = 2000;

interface ActionLabels {
  conjure: string;
  reroll: string;
  conjuring: string;
  copy: string;
  save: string;
  saved: string;
  shuffle: string;
  edit: string;
  copied: string;
  copyFailed: string;
  exportFailed: string;
}

/**
 * Action row beneath the creature card. Hosts:
 *
 *   1. Conjure / Re-roll lore — POSTs to the AI route, populates lore on
 *      success, surfaces friendly errors with a manual-write fallback. The
 *      button label flips from "Conjure" to "Re-roll" once lore exists so
 *      the user understands a click replaces what's already there.
 *   2. Copy link — copies the current URL to the clipboard.
 *   3. Download PNG — dropdown with "Sprite" and "Card" items.
 *   4. Save — persists the creature; flips to a "Saved" indicator.
 *   5. Shuffle — full-nav to /c with a fresh random creature.
 *   6. Edit — full-nav to /create#<encoded> for editing.
 *
 * `saved` comes from `useSyncExternalStore` over the saved-Creatures cache,
 * keyed by the encoded hash, so the displayed state stays in sync with
 * localStorage without ever assigning React state from inside an effect
 * (which would cascade renders).
 */
export function ActionRow({
  def,
  emotion,
  lore,
  onLoreChange,
  encodedHash,
}: ActionRowProps) {
  const locale = useLocale();
  const localePrefix = locale === "en" ? "/en" : "/zh";
  const [ephemeral, setEphemeral] = useState<EphemeralState | null>(null);
  const {
    loreFetch,
    manualLore,
    setManualLore,
    handleConjureLore,
    handleManualLoreSubmit,
  } = useLoreConjuring({ def, locale, onLoreChange });

  // All translated strings live here so the i18n Babel plugin can extract
  // them (it only transforms `t()` calls inside the render scope of a
  // component or hook). Event handlers below close over this record rather
  // than calling `t()` themselves.
  const labels: ActionLabels = {
    conjure: t({ en: "Conjure lore", zh: "召唤传说" }),
    reroll: t({ en: "Re-roll lore", zh: "重抽传说" }),
    conjuring: t({ en: "Conjuring…", zh: "召唤中…" }),
    copy: t({ en: "Copy link", zh: "复制链接" }),
    save: t({ en: "Save", zh: "保存" }),
    saved: t({ en: "Saved", zh: "已保存" }),
    shuffle: t({ en: "Shuffle", zh: "随机生成" }),
    edit: t({ en: "Edit", zh: "编辑" }),
    copied: t({ en: "Copied!", zh: "已复制!" }),
    copyFailed: t({ en: "Copy failed", zh: "复制失败" }),
    exportFailed: t({ en: "Export failed", zh: "导出失败" }),
  };

  const saved = useSyncExternalStore(
    subscribeSavedCreatures,
    () => isCreatureSaved(encodedHash),
    () => false,
  );

  // Auto-dismiss the ephemeral status message. The effect itself does no
  // setState until the timer fires — fine to live in an effect because the
  // signal we're synchronising with is the wall clock.
  useEffect(() => {
    if (ephemeral === null) return;
    const timer = window.setTimeout(() => {
      setEphemeral(null);
    }, EPHEMERAL_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [ephemeral]);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    // `copyTextToClipboard` covers the modern + legacy paths, so we can
    // branch on a simple boolean instead of inspecting per-API errors.
    const ok = await copyTextToClipboard(href);
    setEphemeral(
      ok
        ? { kind: "copied", message: labels.copied }
        : { kind: "error", message: labels.copyFailed },
    );
  };

  const handleSave = () => {
    if (saved) return;
    saveCreature(def);
    notifySavedCreaturesChanged();
  };

  const handleShuffle = () => {
    const next = randomCreature();
    const hash = encodeCreature(next);
    window.location.assign(`${localePrefix}/pixel-creature-creator/c#${hash}`);
  };

  const handleEdit = () => {
    window.location.assign(
      `${localePrefix}/pixel-creature-creator/create#${encodedHash}`,
    );
  };

  const conjureDisabled = loreFetch.kind === "loading";
  // Once lore exists, the same button becomes a re-roll affordance — clicking
  // it discards the current lore and fetches fresh copy. The label change is
  // the user-visible signal that they're replacing existing text.
  const conjureLabel =
    lore === null
      ? conjureDisabled
        ? labels.conjuring
        : labels.conjure
      : conjureDisabled
        ? labels.conjuring
        : labels.reroll;

  return (
    <div css={[stack.tight, styles.root]} data-testid="action-row">
      <div css={[cluster.tight, styles.buttonRow]}>
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
          onClick={() => {
            void handleConjureLore();
          }}
          disabled={conjureDisabled}
          aria-busy={conjureDisabled}
          data-testid="action-conjure-lore"
          aria-label={conjureLabel}
        >
          {conjureLabel}
        </button>

        <button
          type="button"
          css={[
            buttonReset.base,
            typeRole.label,
            corner.radius_round,
            actionRowStyles.button,
            transition.colors,
          ]}
          onClick={() => {
            void handleCopyLink();
          }}
          data-testid="action-copy-link"
          aria-label={labels.copy}
        >
          {labels.copy}
        </button>

        <DownloadMenu
          def={def}
          emotion={emotion}
          lore={lore}
          onExportFailed={() => {
            setEphemeral({ kind: "error", message: labels.exportFailed });
          }}
        />

        <button
          type="button"
          css={[
            buttonReset.base,
            typeRole.label,
            corner.radius_round,
            actionRowStyles.button,
            saved && styles.buttonSaved,
            transition.colors,
          ]}
          onClick={handleSave}
          data-testid="action-save"
          aria-pressed={saved}
          aria-label={saved ? labels.saved : labels.save}
        >
          {saved ? labels.saved : labels.save}
        </button>

        <button
          type="button"
          css={[
            buttonReset.base,
            typeRole.label,
            corner.radius_round,
            actionRowStyles.button,
            transition.colors,
          ]}
          onClick={handleShuffle}
          data-testid="action-shuffle"
          aria-label={labels.shuffle}
        >
          {labels.shuffle}
        </button>

        <button
          type="button"
          css={[
            buttonReset.base,
            typeRole.label,
            corner.radius_round,
            actionRowStyles.button,
            transition.colors,
          ]}
          onClick={handleEdit}
          data-testid="action-edit"
          aria-label={labels.edit}
        >
          {labels.edit}
        </button>
      </div>

      <LoreFeedback
        loreFetch={loreFetch}
        lore={lore}
        manualLore={manualLore}
        onManualLoreChange={setManualLore}
        onManualLoreSubmit={handleManualLoreSubmit}
      />

      {ephemeral !== null && (
        <p
          role="status"
          css={[
            typeRole.bodySmall,
            corner.radius_2,
            actionRowStyles.ephemeral,
            ephemeral.kind === "error" && actionRowStyles.ephemeralError,
          ]}
          data-testid="action-ephemeral"
          data-kind={ephemeral.kind}
        >
          {ephemeral.message}
        </p>
      )}
    </div>
  );
}

const styles = stylex.create({
  root: {
    width: "100%",
  },
  buttonRow: {
    justifyContent: "center",
  },
  buttonSaved: {
    backgroundColor: color.bgAccent,
    color: color.fgOnAccent,
    borderColor: color.borderAccent,
  },
});
