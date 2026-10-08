"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { ThumbsDownIcon } from "@phosphor-icons/react/dist/ssr/ThumbsDown";
import { ThumbsUpIcon } from "@phosphor-icons/react/dist/ssr/ThumbsUp";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  measure,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { DetailOverlay } from "#src/movie-database/detail-overlay.tsx";
import type { StoredPreference } from "./types.ts";
import { usePreferences } from "./use-preferences.ts";

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
      <PreferenceTrigger
        count={preferences.length}
        onOpen={() => {
          setIsOpen(true);
        }}
      />
      <PreferencePanel
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        preferences={preferences}
        onRemove={(id) => void remove(id)}
        onClearAll={clearAll}
      />
    </>
  );
}

export function PreferenceTrigger({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  const locale = useLocale();
  const label =
    count > 0
      ? `${t({ en: "Preferences,", zh: "偏好设置，" })} ${count.toLocaleString(locale)} ${t({ en: "saved", zh: "项已保存" })}`
      : t({ en: "Preferences", zh: "偏好设置" });

  return (
    <button
      type="button"
      css={[
        buttonReset.base,
        flex.inlineCenter,
        corner.radius_round,
        triggerStyles.button,
      ]}
      onClick={onOpen}
      aria-label={label}
    >
      <SlidersHorizontalIcon weight="bold" role="presentation" />
      {count > 0 && (
        <span
          css={[corner.radius_round, triggerStyles.dot]}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

const triggerStyles = stylex.create({
  button: {
    position: "relative",
    width: "1.75rem",
    height: "1.75rem",
    fontSize: controlSize._4,
    color: color.fgMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  dot: {
    position: "absolute",
    top: "3px",
    right: "3px",
    width: "6px",
    height: "6px",
    backgroundColor: color.bgAccent,
  },
});

interface PreferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReadonlyArray<StoredPreference>;
  onRemove: (id: string) => void;
  onClearAll: () => Promise<void>;
}

export function PreferencePanel({
  isOpen,
  onClose,
  preferences,
  onRemove,
  onClearAll,
}: PreferencePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const didMountRef = useRef(false);

  // When the confirmation row appears, move focus to Cancel (safer default for
  // a destructive confirm). When it's dismissed by the user, return focus to
  // the Clear trigger — but only if it's still in the DOM, which it isn't when
  // the clear succeeded and the last preference was removed. Skip the initial
  // render so we don't steal focus from DetailOverlay's initialFocusRef.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (confirmingClear) {
      cancelButtonRef.current?.focus();
    } else {
      clearTriggerRef.current?.focus();
    }
  }, [confirmingClear]);

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
        <h2 css={[typeRole.h2, styles.title]}>
          {t({ en: "Your Preferences", zh: "你的偏好" })}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          css={[
            buttonReset.base,
            flex.inlineCenter,
            corner.radius_round,
            styles.closeButton,
          ]}
          onClick={onClose}
          aria-label={t({ en: "Close", zh: "关闭" })}
        >
          <XIcon weight="bold" />
        </button>
      </div>

      <div css={[flex.row, corner.radius_2, styles.infoBanner]}>
        <InfoIcon
          weight="regular"
          role="presentation"
          {...stylex.props(styles.infoIcon)}
        />
        <p css={[typeRole.bodySmall, styles.infoText]}>
          {t({
            en: "Preferences are stored locally in your browser. When you chat with the AI, they're included as context to personalise its replies.",
            zh: "偏好仅存储在你的浏览器中。当你与 AI 对话时，它们会作为上下文一起发送，以便个性化回复。",
          })}
        </p>
      </div>

      <div css={[stack.group, styles.body]}>
        {preferences.length === 0 ? (
          <div css={[flex.center, styles.emptyState]}>
            <p css={[typeRole.body, styles.emptyText]}>
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
            <div css={[row.tight, styles.confirmRow]}>
              <p css={[typeRole.bodySmall, styles.confirmText]}>
                {t({
                  en: "Clear all preferences?",
                  zh: "清除所有偏好？",
                })}
              </p>
              <button
                type="button"
                css={[
                  typeRole.label,
                  buttonReset.base,
                  corner.radius_round,
                  styles.confirmButton,
                ]}
                onClick={() => void handleClearAll()}
              >
                {t({ en: "Yes, clear", zh: "确认清除" })}
              </button>
              <button
                ref={cancelButtonRef}
                type="button"
                css={[
                  typeRole.label,
                  buttonReset.base,
                  corner.radius_round,
                  styles.cancelButton,
                ]}
                onClick={() => {
                  setConfirmingClear(false);
                }}
              >
                {t({ en: "Cancel", zh: "取消" })}
              </button>
            </div>
          ) : (
            <button
              ref={clearTriggerRef}
              type="button"
              css={[
                typeRole.label,
                buttonReset.base,
                flex.row,
                styles.clearButton,
              ]}
              onClick={() => {
                setConfirmingClear(true);
              }}
            >
              <TrashIcon weight="bold" role="presentation" />
              {t({
                en: "Clear all preferences",
                zh: "清除所有偏好",
              })}
            </button>
          )}
          {/* Stable live region: mounted whenever the footer is, populated
              only while confirming, so AT reliably detects the content
              change and announces the prompt. */}
          <div role="status" aria-live="polite" css={a11y.srOnly}>
            {confirmingClear
              ? t({
                  en: "Clear all preferences? Confirm or cancel.",
                  zh: "清除所有偏好？请确认或取消。",
                })
              : ""}
          </div>
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
    <div css={stack.tight}>
      <h3 css={[typeRole.overline, styles.categoryLabel]}>{label}</h3>
      <div css={cluster.tight}>
        {prefs.map((pref) => (
          <PreferenceChip
            key={pref.id}
            preference={pref}
            onRemove={() => {
              onRemove(pref.id);
            }}
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
    <span
      css={[
        typeRole.label,
        corner.radius_round,
        styles.chip,
        isLike ? styles.chipLike : styles.chipDislike,
      ]}
    >
      <span css={[flex.inlineCenter, styles.sentimentIcon]}>
        {isLike ? (
          <ThumbsUpIcon weight="fill" role="presentation" />
        ) : (
          <ThumbsDownIcon weight="fill" role="presentation" />
        )}
      </span>
      <span css={styles.chipLabel}>{preference.value}</span>
      <button
        type="button"
        css={[
          buttonReset.base,
          flex.inlineCenter,
          corner.radius_round,
          styles.chipRemove,
        ]}
        onClick={onRemove}
        aria-label={`${t({ en: "Remove", zh: "移除" })} ${preference.value}`}
      >
        <XIcon weight="bold" />
      </button>
    </span>
  );
}

const BODY_INLINE_INSET = space._4;

const styles = stylex.create({
  header: {
    paddingTop: space._4,
    paddingBottom: space._3,
    paddingLeft: space._5,
    paddingRight: space._4,
  },
  title: {
    margin: 0,
    color: color.fg,
  },
  closeButton: {
    width: "2rem",
    height: "2rem",
    fontSize: controlSize._4,
    color: color.fgMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    transition: "background-color 0.15s ease",
    cursor: "pointer",
  },
  infoBanner: {
    gap: rhythm.tight,
    fontSize: controlSize._4,
    marginInline: BODY_INLINE_INSET,
    marginBottom: rhythm.item,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceSunken,
    alignItems: "flex-start",
  },
  infoIcon: {
    flexShrink: 0,
    color: color.fgMuted,
    position: "relative",
    top: "0.15rem",
  },
  infoText: {
    margin: 0,
    color: color.fgMuted,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    paddingInline: BODY_INLINE_INSET,
    paddingBottom: space._3,
  },
  emptyState: {
    paddingBlock: space._9,
  },
  emptyText: {
    margin: 0,
    color: color.fgMuted,
    textAlign: "center",
    maxInlineSize: measure.short,
  },
  categoryLabel: {
    margin: 0,
    color: color.fgMuted,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    paddingBlock: space._0,
    paddingLeft: space._2,
    paddingRight: space._1,
    borderWidth: border.size_1,
    borderStyle: "solid",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  chipLike: {
    borderColor: `color-mix(in srgb, ${color.borderAccent} 30%, transparent)`,
    backgroundColor: {
      default: `color-mix(in srgb, ${color.bgAccent} 8%, transparent)`,
      ":hover": {
        default: null,
        [pointer.canHover]: `color-mix(in srgb, ${color.bgAccent} 14%, transparent)`,
      },
    },
    color: color.fg,
  },
  chipDislike: {
    borderColor: `color-mix(in srgb, ${color.borderDanger} 25%, transparent)`,
    backgroundColor: {
      default: `color-mix(in srgb, ${color.bgDanger} 6%, transparent)`,
      ":hover": {
        default: null,
        [pointer.canHover]: `color-mix(in srgb, ${color.bgDanger} 12%, transparent)`,
      },
    },
    color: color.fg,
  },
  sentimentIcon: {
    flexShrink: 0,
    fontSize: controlSize._3,
  },
  chipLabel: {
    whiteSpace: "nowrap",
  },
  chipRemove: {
    flexShrink: 0,
    width: "1.1rem",
    height: "1.1rem",
    fontSize: controlSize._3,
    color: color.fgMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgNeutralSubtle,
      },
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
    borderTopColor: color.border,
  },
  clearButton: {
    gap: controlSize._2,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    cursor: "pointer",
    transition: "color 0.15s ease",
  },
  confirmRow: {
    alignItems: "center",
  },
  confirmText: {
    margin: 0,
    color: color.fg,
  },
  confirmButton: {
    paddingBlock: space._0,
    paddingInline: space._3,
    backgroundColor: {
      default: color.bgAccent,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgAccentHover,
      },
    },
    color: color.fgOnAccent,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  cancelButton: {
    paddingBlock: space._0,
    paddingInline: space._3,
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    color: color.fgMuted,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
});
