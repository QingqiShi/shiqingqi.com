"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { ThumbsDownIcon } from "@phosphor-icons/react/dist/ssr/ThumbsDown";
import { ThumbsUpIcon } from "@phosphor-icons/react/dist/ssr/ThumbsUp";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import type { StoredPreference } from "#src/preference-store/preference-store.ts";
import { usePreferences } from "#src/preference-store/use-preferences.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { DetailOverlay } from "./detail-overlay";

const CATEGORY_ORDER: ReadonlyArray<StoredPreference["category"]> = [
  "genre",
  "director",
  "actor",
  "keyword",
  "language",
  "content_rating",
];

/**
 * Renders the preferences trigger button and manages the panel overlay.
 * Uses a single `usePreferences()` instance so the button indicator
 * and the panel content always stay in sync.
 */
export function PreferenceManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences, remove, clearAll } = usePreferences();

  return (
    <>
      <button
        type="button"
        css={[buttonReset.base, flex.inlineCenter, triggerStyles.button]}
        onClick={() => setIsOpen(true)}
        aria-label={t({ en: "Preferences", zh: "偏好设置" })}
      >
        <SlidersHorizontalIcon size={16} role="presentation" />
        {preferences.length > 0 && (
          <span css={triggerStyles.dot} aria-hidden="true" />
        )}
      </button>
      <PreferencePanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        preferences={preferences}
        onRemove={(id) => void remove(id)}
        onClearAll={clearAll}
      />
    </>
  );
}

const triggerStyles = stylex.create({
  button: {
    position: "relative",
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: border.radius_round,
    color: color.textMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
    marginBottom: space._1,
  },
  dot: {
    position: "absolute",
    top: "3px",
    right: "3px",
    width: "6px",
    height: "6px",
    borderRadius: border.radius_round,
    backgroundColor: color.controlActive,
  },
});

interface PreferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReadonlyArray<StoredPreference>;
  onRemove: (id: string) => void;
  onClearAll: () => Promise<void>;
}

function PreferencePanel({
  isOpen,
  onClose,
  preferences,
  onRemove,
  onClearAll,
}: PreferencePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const grouped = new Map<StoredPreference["category"], StoredPreference[]>();
  for (const pref of preferences) {
    const list = grouped.get(pref.category);
    if (list) {
      list.push(pref);
    } else {
      grouped.set(pref.category, [pref]);
    }
  }

  const handleClearAll = async () => {
    try {
      await onClearAll();
    } finally {
      setConfirmingClear(false);
    }
  };

  return (
    <DetailOverlay
      isOpen={isOpen}
      onClose={onClose}
      aria-label={t({ en: "Your preferences", zh: "你的偏好" })}
      width="narrow"
      height="compact"
      layout="flex-column"
      hideCloseButton
      initialFocusRef={closeButtonRef}
    >
      <div css={[flex.between, styles.header]}>
        <h2 css={styles.title}>
          {t({ en: "Your Preferences", zh: "你的偏好" })}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          css={[buttonReset.base, flex.inlineCenter, styles.closeButton]}
          onClick={onClose}
          aria-label={t({ en: "Close", zh: "关闭" })}
        >
          <XIcon size={18} />
        </button>
      </div>

      <div css={[flex.row, styles.infoBanner]}>
        <InfoIcon size={16} css={styles.infoIcon} role="presentation" />
        <p css={styles.infoText}>
          {t({
            en: "Preferences are stored locally on your device. They help the AI personalise recommendations. Nothing is sent to a server.",
            zh: "偏好仅存储在你的设备上，用于帮助 AI 个性化推荐，不会发送至服务器。",
          })}
        </p>
      </div>

      <div css={styles.body}>
        {preferences.length === 0 ? (
          <div css={[flex.center, styles.emptyState]}>
            <p css={styles.emptyText}>
              {t({
                en: "No preferences yet. Chat with the AI and it will learn what you like.",
                zh: "还没有偏好记录。和 AI 聊天，它会了解你的喜好。",
              })}
            </p>
          </div>
        ) : (
          CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => (
            <CategorySection
              key={category}
              category={category}
              preferences={grouped.get(category) ?? []}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {preferences.length > 0 && (
        <div css={styles.footer}>
          {confirmingClear ? (
            <div css={[flex.row, styles.confirmRow]}>
              <p css={styles.confirmText}>
                {t({
                  en: "Clear all preferences?",
                  zh: "清除所有偏好？",
                })}
              </p>
              <button
                type="button"
                css={[buttonReset.base, styles.confirmButton]}
                onClick={() => void handleClearAll()}
              >
                {t({ en: "Yes, clear", zh: "确认清除" })}
              </button>
              <button
                type="button"
                css={[buttonReset.base, styles.cancelButton]}
                onClick={() => setConfirmingClear(false)}
              >
                {t({ en: "Cancel", zh: "取消" })}
              </button>
            </div>
          ) : (
            <button
              type="button"
              css={[buttonReset.base, flex.row, styles.clearButton]}
              onClick={() => setConfirmingClear(true)}
            >
              <TrashIcon size={14} role="presentation" />
              {t({
                en: "Clear all preferences",
                zh: "清除所有偏好",
              })}
            </button>
          )}
        </div>
      )}
    </DetailOverlay>
  );
}

function CategorySection({
  category,
  preferences: prefs,
  onRemove,
}: {
  category: StoredPreference["category"];
  preferences: ReadonlyArray<StoredPreference>;
  onRemove: (id: string) => void;
}) {
  const label = {
    genre: t({ en: "Genres", zh: "类型" }),
    actor: t({ en: "Actors", zh: "演员" }),
    director: t({ en: "Directors", zh: "导演" }),
    content_rating: t({ en: "Content rating", zh: "内容分级" }),
    language: t({ en: "Languages", zh: "语言" }),
    keyword: t({ en: "Keywords", zh: "关键词" }),
  }[category];

  return (
    <div css={styles.categorySection}>
      <h3 css={styles.categoryLabel}>{label}</h3>
      <div css={[flex.wrap, styles.chipContainer]}>
        {prefs.map((pref) => (
          <PreferenceChip
            key={pref.id}
            preference={pref}
            onRemove={() => onRemove(pref.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PreferenceChip({
  preference,
  onRemove,
}: {
  preference: StoredPreference;
  onRemove: () => void;
}) {
  const isLike = preference.sentiment === "like";
  return (
    <span css={[styles.chip, isLike ? styles.chipLike : styles.chipDislike]}>
      <span css={[flex.inlineCenter, styles.sentimentIcon]}>
        {isLike ? (
          <ThumbsUpIcon size={12} weight="fill" role="presentation" />
        ) : (
          <ThumbsDownIcon size={12} weight="fill" role="presentation" />
        )}
      </span>
      <span css={styles.chipLabel}>{preference.value}</span>
      <button
        type="button"
        css={[buttonReset.base, flex.inlineCenter, styles.chipRemove]}
        onClick={onRemove}
        aria-label={t({ en: "Remove", zh: "移除" })}
      >
        <XIcon size={10} />
      </button>
    </span>
  );
}

const styles = stylex.create({
  header: {
    paddingTop: space._4,
    paddingBottom: space._3,
    paddingLeft: space._5,
    paddingRight: space._4,
  },
  title: {
    margin: 0,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_6,
    color: color.textMain,
    letterSpacing: "-0.01em",
  },
  closeButton: {
    width: "2rem",
    height: "2rem",
    borderRadius: border.radius_round,
    color: color.textMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    transition: "background-color 0.15s ease",
    cursor: "pointer",
  },
  infoBanner: {
    gap: space._2,
    marginInline: space._4,
    marginBottom: space._3,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundMain,
    alignItems: "flex-start",
  },
  infoIcon: {
    flexShrink: 0,
    color: color.textMuted,
    marginTop: "0.15rem",
  },
  infoText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    paddingInline: space._4,
    paddingBottom: space._3,
  },
  emptyState: {
    paddingBlock: space._9,
  },
  emptyText: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    textAlign: "center",
    lineHeight: font.lineHeight_4,
    maxWidth: "24ch",
  },
  categorySection: {
    marginBottom: space._4,
  },
  categoryLabel: {
    margin: 0,
    marginBottom: space._2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  chipContainer: {
    gap: space._1,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._0,
    paddingLeft: space._2,
    paddingRight: space._1,
    borderRadius: border.radius_round,
    borderWidth: border.size_1,
    borderStyle: "solid",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  chipLike: {
    borderColor: `color-mix(in srgb, ${color.controlActive} 30%, transparent)`,
    backgroundColor: {
      default: `color-mix(in srgb, ${color.controlActive} 8%, transparent)`,
      ":hover": `color-mix(in srgb, ${color.controlActive} 14%, transparent)`,
    },
    color: color.textMain,
  },
  chipDislike: {
    borderColor: "color-mix(in srgb, #e05050 25%, transparent)",
    backgroundColor: {
      default: "color-mix(in srgb, #e05050 6%, transparent)",
      ":hover": "color-mix(in srgb, #e05050 12%, transparent)",
    },
    color: color.textMain,
  },
  sentimentIcon: {
    flexShrink: 0,
  },
  chipLabel: {
    whiteSpace: "nowrap",
  },
  chipRemove: {
    flexShrink: 0,
    width: "1.1rem",
    height: "1.1rem",
    borderRadius: border.radius_round,
    color: color.textMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": color.controlTrack,
    },
    opacity: 0.5,
    transition: "opacity 0.15s ease, background-color 0.15s ease",
    cursor: "pointer",
  },
  footer: {
    paddingBlock: space._3,
    paddingInline: space._5,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
  },
  clearButton: {
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    cursor: "pointer",
    transition: "color 0.15s ease",
  },
  confirmRow: {
    gap: space._2,
    alignItems: "center",
  },
  confirmText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  confirmButton: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._0,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
    },
    color: color.textOnActive,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  cancelButton: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._0,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    color: color.textMuted,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
});
