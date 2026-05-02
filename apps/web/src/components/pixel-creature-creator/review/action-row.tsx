"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { CreatureDef, Emotion } from "../state/creature-schema";
import { encodeCreature } from "../state/encode-decode";
import { saveCreature } from "../state/local-storage";
import {
  isSaved,
  notifySavedStore,
  subscribeToSavedStore,
} from "../state/saved-store";
import { randomCreature } from "../wizard/random-creature";
import type { LoreData } from "./creature-card";
import { exportCardPng, exportSpritePng } from "./png-export";
import { slugifyName } from "./slug";

interface ActionRowProps {
  def: CreatureDef;
  emotion: Emotion;
  lore: LoreData | null;
  onLoreChange: (lore: LoreData | null) => void;
  encodedHash: string;
}

type EphemeralKind = "copied" | "error";

interface EphemeralState {
  kind: EphemeralKind;
  message: string;
}

const EPHEMERAL_TIMEOUT_MS = 2000;

/**
 * Copy `text` to the system clipboard. Prefers the modern async API and
 * falls back to a hidden textarea + `document.execCommand("copy")` for
 * non-secure contexts (HTTP, file://, in-app webviews) where
 * `navigator.clipboard` is undefined or throws. `execCommand` is deprecated
 * but remains the only working path in those environments. Returns
 * `boolean` so callers can branch on success without inspecting errors.
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  // `navigator.clipboard` is typed as always-defined in modern lib.dom but
  // can throw at runtime on HTTP origins or in restricted webviews. The
  // try/catch guards both the missing-API and rejected-promise cases; we
  // then drop into the legacy textarea path.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path below.
  }
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  // Wrap focus/select/exec all in one try so a synchronous throw at any step
  // (e.g. `select()` raising in restricted webviews) still hits the finally
  // block and removes the textarea from the DOM.
  let ok = false;
  try {
    textarea.focus();
    textarea.select();
    // `execCommand` is deprecated but is the only API that works in
    // non-secure contexts where `navigator.clipboard` is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    ok = document.execCommand("copy");
  } catch {
    // ok stays false; the textarea is still removed in the finally block.
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

interface ActionLabels {
  conjure: string;
  reroll: string;
  conjuring: string;
  copy: string;
  download: string;
  downloadSprite: string;
  downloadCard: string;
  save: string;
  saved: string;
  shuffle: string;
  edit: string;
  copied: string;
  copyFailed: string;
  exportFailed: string;
  loreError: string;
  rateLimited: string;
  manualLabel: string;
  manualPlaceholder: string;
  manualSubmit: string;
}

type LoreFetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; reason: "rate_limited" | "generic" };

interface LoreApiSuccess {
  nameSuggestion: string;
  loreEn: string;
  loreZh: string;
  type: string;
}

function isLoreApiSuccess(value: unknown): value is LoreApiSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.nameSuggestion === "string" &&
    typeof candidate.loreEn === "string" &&
    typeof candidate.loreZh === "string" &&
    typeof candidate.type === "string"
  );
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
 * `saved` is derived directly from `listSavedCreatures()` keyed by the
 * encoded hash plus a save counter, so the displayed state stays in sync
 * with localStorage without ever assigning React state from inside an
 * effect (which would cascade renders).
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
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [loreFetch, setLoreFetch] = useState<LoreFetchState>({ kind: "idle" });
  const [manualLore, setManualLore] = useState("");
  const downloadRef = useRef<HTMLDivElement>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement>(null);
  const manualTextareaId = useId();

  // All translated strings live here so the i18n Babel plugin can extract
  // them (it only transforms `t()` calls inside the render scope of a
  // component or hook). Event handlers below close over this record rather
  // than calling `t()` themselves.
  const labels: ActionLabels = {
    conjure: t({ en: "Conjure lore", zh: "召唤传说" }),
    reroll: t({ en: "Re-roll lore", zh: "重抽传说" }),
    conjuring: t({ en: "Conjuring…", zh: "召唤中…" }),
    copy: t({ en: "Copy link", zh: "复制链接" }),
    download: t({ en: "Download PNG", zh: "下载 PNG" }),
    downloadSprite: t({ en: "Sprite", zh: "精灵" }),
    downloadCard: t({ en: "Card", zh: "卡牌" }),
    save: t({ en: "Save", zh: "保存" }),
    saved: t({ en: "Saved", zh: "已保存" }),
    shuffle: t({ en: "Shuffle", zh: "随机生成" }),
    edit: t({ en: "Edit", zh: "编辑" }),
    copied: t({ en: "Copied!", zh: "已复制!" }),
    copyFailed: t({ en: "Copy failed", zh: "复制失败" }),
    exportFailed: t({ en: "Export failed", zh: "导出失败" }),
    loreError: t({
      en: "Lore conjuring failed. You can write your own below.",
      zh: "传说召唤失败,你可以在下方手写一段。",
    }),
    rateLimited: t({
      en: "Slow down — please try again in a minute.",
      zh: "稍等片刻,请一分钟后再试。",
    }),
    manualLabel: t({ en: "Write your own lore", zh: "手写传说" }),
    manualPlaceholder: t({
      en: "Type a sentence about your creature…",
      zh: "为你的生物写一句话…",
    }),
    manualSubmit: t({ en: "Save lore", zh: "保存传说" }),
  };

  const saved = useSyncExternalStore(
    subscribeToSavedStore,
    () => isSaved(encodedHash),
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

  // Close the download menu when clicking outside it. `pointerdown` (not
  // `click`) so the dropdown closes before any newly-clicked button has a
  // chance to mistakenly read it as still-open.
  useEffect(() => {
    if (!downloadOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = downloadRef.current;
      if (root === null) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setDownloadOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [downloadOpen]);

  // Close the download menu on Escape and return focus to the trigger so
  // keyboard users don't get stranded inside the closed menu's tab order.
  useEffect(() => {
    if (!downloadOpen) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDownloadOpen(false);
        downloadTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [downloadOpen]);

  const handleConjureLore = async () => {
    // Guard against rapid double-clicks: the disabled prop on the button
    // catches up only after React commits the loading state, so a second
    // activation in the same tick can still fire. Bail synchronously here
    // to keep the request count to one per intent.
    if (loreFetch.kind === "loading") return;
    setLoreFetch({ kind: "loading" });
    try {
      const response = await fetch("/api/pixel-creature-creator/lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ def, locale }),
      });
      if (response.status === 429) {
        setLoreFetch({ kind: "error", reason: "rate_limited" });
        return;
      }
      if (!response.ok) {
        setLoreFetch({ kind: "error", reason: "generic" });
        return;
      }
      const json: unknown = await response.json();
      if (!isLoreApiSuccess(json)) {
        setLoreFetch({ kind: "error", reason: "generic" });
        return;
      }
      onLoreChange({ loreEn: json.loreEn, loreZh: json.loreZh });
      setLoreFetch({ kind: "idle" });
    } catch {
      setLoreFetch({ kind: "error", reason: "generic" });
    }
  };

  const handleManualLoreSubmit = () => {
    const trimmed = manualLore.trim();
    if (trimmed.length === 0) return;
    // Manual lore lives in whichever locale the user wrote it in; we mirror
    // it into both halves so the card renders correctly regardless of the
    // active locale and the PNG export still has something to show.
    onLoreChange({ loreEn: trimmed, loreZh: trimmed });
    setLoreFetch({ kind: "idle" });
    setManualLore("");
  };

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

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // `revokeObjectURL` is best-effort; a tiny delay gives the click handler
    // time to start the download in browsers that bail out on early revoke.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const buildFilename = (kind: "sprite" | "card") => {
    const base = slugifyName(def.name);
    return `creature-${base}-${kind}-${emotion}.png`;
  };

  const handleDownloadSprite = async () => {
    setDownloadOpen(false);
    try {
      const blob = await exportSpritePng(def, emotion);
      triggerDownload(blob, buildFilename("sprite"));
    } catch {
      setEphemeral({ kind: "error", message: labels.exportFailed });
    }
  };

  const handleDownloadCard = async () => {
    setDownloadOpen(false);
    try {
      const blob = await exportCardPng(def, emotion, lore, locale);
      triggerDownload(blob, buildFilename("card"));
    } catch {
      setEphemeral({ kind: "error", message: labels.exportFailed });
    }
  };

  const handleSave = () => {
    if (saved) return;
    saveCreature(def);
    notifySavedStore();
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
  const showManualFallback = loreFetch.kind === "error" && lore === null;
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
    <div css={styles.root} data-testid="action-row">
      <div css={styles.buttonRow}>
        <button
          type="button"
          css={[styles.button, styles.buttonPrimary]}
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
          css={styles.button}
          onClick={() => {
            void handleCopyLink();
          }}
          data-testid="action-copy-link"
          aria-label={labels.copy}
        >
          {labels.copy}
        </button>

        <div css={styles.downloadWrap} ref={downloadRef}>
          <button
            type="button"
            ref={downloadTriggerRef}
            css={styles.button}
            aria-haspopup="menu"
            aria-expanded={downloadOpen}
            onClick={() => {
              setDownloadOpen((open) => !open);
            }}
            data-testid="action-download"
            aria-label={labels.download}
          >
            {labels.download}
          </button>
          {downloadOpen && (
            <div role="menu" css={styles.downloadMenu}>
              <button
                type="button"
                role="menuitem"
                css={styles.menuItem}
                onClick={() => {
                  void handleDownloadSprite();
                }}
                data-testid="action-download-sprite"
              >
                {labels.downloadSprite}
              </button>
              <button
                type="button"
                role="menuitem"
                css={styles.menuItem}
                onClick={() => {
                  void handleDownloadCard();
                }}
                data-testid="action-download-card"
              >
                {labels.downloadCard}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          css={[styles.button, saved && styles.buttonSaved]}
          onClick={handleSave}
          data-testid="action-save"
          aria-pressed={saved}
          aria-label={saved ? labels.saved : labels.save}
        >
          {saved ? labels.saved : labels.save}
        </button>

        <button
          type="button"
          css={styles.button}
          onClick={handleShuffle}
          data-testid="action-shuffle"
          aria-label={labels.shuffle}
        >
          {labels.shuffle}
        </button>

        <button
          type="button"
          css={styles.button}
          onClick={handleEdit}
          data-testid="action-edit"
          aria-label={labels.edit}
        >
          {labels.edit}
        </button>
      </div>

      {loreFetch.kind === "error" && (
        <p
          role="status"
          css={[styles.ephemeral, styles.ephemeralError]}
          data-testid="lore-error"
          data-reason={loreFetch.reason}
        >
          {loreFetch.reason === "rate_limited"
            ? labels.rateLimited
            : labels.loreError}
        </p>
      )}

      {showManualFallback && (
        <div css={styles.manualFallback} data-testid="lore-manual">
          <label htmlFor={manualTextareaId} css={styles.manualLabel}>
            {labels.manualLabel}
          </label>
          <textarea
            id={manualTextareaId}
            css={styles.manualTextarea}
            value={manualLore}
            onChange={(event) => {
              setManualLore(event.target.value);
            }}
            placeholder={labels.manualPlaceholder}
            rows={3}
            maxLength={200}
            data-testid="lore-manual-input"
          />
          <button
            type="button"
            css={[styles.button, styles.buttonPrimary]}
            onClick={handleManualLoreSubmit}
            disabled={manualLore.trim().length === 0}
            data-testid="lore-manual-submit"
          >
            {labels.manualSubmit}
          </button>
        </div>
      )}

      {ephemeral !== null && (
        <p
          role="status"
          css={[
            styles.ephemeral,
            ephemeral.kind === "error" && styles.ephemeralError,
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
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    width: "100%",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
    justifyContent: "center",
  },
  button: {
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    color: color.textMain,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "999px",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": 0.7,
    },
    outlineOffset: "2px",
    transitionProperty: "background-color, border-color, color",
    transitionDuration: "120ms",
  },
  buttonPrimary: {
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":focus-visible": color.controlActiveHover,
    },
    color: color.textOnActive,
    borderColor: color.controlActive,
  },
  buttonSaved: {
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    borderColor: color.controlActive,
  },
  downloadWrap: {
    position: "relative",
  },
  downloadMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    insetInlineStart: 0,
    minInlineSize: "10rem",
    backgroundColor: color.backgroundMain,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "10px",
    padding: space._0,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    zIndex: 10,
  },
  menuItem: {
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    color: color.textMain,
    borderWidth: 0,
    borderRadius: "8px",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    cursor: "pointer",
    textAlign: "left",
  },
  ephemeral: {
    margin: 0,
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: color.backgroundRaised,
    borderRadius: "10px",
    fontSize: font.uiBodySmall,
    color: color.textMain,
    alignSelf: "center",
    textAlign: "center",
    maxInlineSize: "32rem",
  },
  ephemeralError: {
    color: color.textMain,
    backgroundColor: color.backgroundHover,
  },
  manualFallback: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.backgroundRaised,
    borderRadius: "10px",
    alignSelf: "center",
    inlineSize: "100%",
    maxInlineSize: "32rem",
  },
  manualLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
  manualTextarea: {
    inlineSize: "100%",
    minBlockSize: "5rem",
    boxSizing: "border-box",
    padding: space._2,
    fontSize: font.uiBody,
    fontFamily: "inherit",
    color: color.textMain,
    backgroundColor: color.backgroundMain,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "8px",
    resize: "vertical",
  },
});
