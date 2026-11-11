"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { ThumbsDownIcon } from "@phosphor-icons/react/dist/ssr/ThumbsDown";
import { ThumbsUpIcon } from "@phosphor-icons/react/dist/ssr/ThumbsUp";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Divider } from "@tuja/ui/components/divider";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
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
    <Button
      look="ghost"
      size="sm"
      onClick={onOpen}
      aria-label={label}
      icon={
        <>
          <SlidersHorizontalIcon weight="bold" role="presentation" />
          {count > 0 && (
            <span
              css={[corner.radius_round, triggerStyles.dot]}
              aria-hidden="true"
            />
          )}
        </>
      }
    />
  );
}

const triggerStyles = stylex.create({
  dot: {
    position: "absolute",
    top: "3px",
    right: "3px",
    width: "6px",
    height: "6px",
    backgroundColor: color.primary,
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

  const handleClearAll = () =>
    onClearAll().finally(() => {
      setConfirmingClear(false);
    });

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
        <Heading level={2} look="h2">
          {t({ en: "Your Preferences", zh: "你的偏好" })}
        </Heading>
        <Button
          ref={closeButtonRef}
          look="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t({ en: "Close", zh: "关闭" })}
          icon={<XIcon weight="bold" />}
        />
      </div>

      <Callout
        intent="neutral"
        icon={<InfoIcon weight="regular" />}
        css={styles.infoBanner}
      >
        {t({
          en: "Preferences are stored locally in your browser. When you chat with the AI, they're included as context to personalise its replies.",
          zh: "偏好仅存储在你的浏览器中。当你与 AI 对话时，它们会作为上下文一起发送，以便个性化回复。",
        })}
      </Callout>

      <div css={[stack.group, styles.body]}>
        {preferences.length === 0 ? (
          <EmptyState
            title={t({
              en: "No preferences yet. Chat with the AI and it will learn what you like.",
              zh: "还没有偏好记录。和 AI 聊天，它会了解你的喜好。",
            })}
          />
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

      {preferences.length > 0 && <Divider />}
      {preferences.length > 0 && (
        <div css={styles.footer}>
          {confirmingClear ? (
            <div css={[row.tight, styles.confirmRow]}>
              <Text look="bodySmall" measure="none">
                {t({
                  en: "Clear all preferences?",
                  zh: "清除所有偏好？",
                })}
              </Text>
              <Button
                look="destructive"
                size="sm"
                onClick={() => void handleClearAll()}
              >
                {t({ en: "Yes, clear", zh: "确认清除" })}
              </Button>
              <Button
                ref={cancelButtonRef}
                look="ghost"
                size="sm"
                onClick={() => {
                  setConfirmingClear(false);
                }}
              >
                {t({ en: "Cancel", zh: "取消" })}
              </Button>
            </div>
          ) : (
            <Button
              ref={clearTriggerRef}
              look="ghost"
              size="sm"
              bleed="start"
              onClick={() => {
                setConfirmingClear(true);
              }}
              icon={<TrashIcon weight="bold" role="presentation" />}
            >
              {t({
                en: "Clear all preferences",
                zh: "清除所有偏好",
              })}
            </Button>
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
      <Text look="overline" tone="muted">
        {label}
      </Text>
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
    <span css={[flex.inlineCenter, styles.chip]}>
      <Badge
        intent={isLike ? "primary" : "destructive"}
        icon={
          isLike ? (
            <ThumbsUpIcon weight="fill" role="presentation" />
          ) : (
            <ThumbsDownIcon weight="fill" role="presentation" />
          )
        }
      >
        <span css={styles.chipLabel}>{preference.value}</span>
      </Badge>
      <Button
        look="ghost"
        size="xs"
        onClick={onRemove}
        aria-label={`${t({ en: "Remove", zh: "移除" })} ${preference.value}`}
        icon={<XIcon weight="bold" />}
      />
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
  infoBanner: {
    marginInline: BODY_INLINE_INSET,
    marginBottom: rhythm.item,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    paddingInline: BODY_INLINE_INSET,
    paddingBottom: space._3,
  },
  chip: {
    gap: rhythm.inline,
  },
  chipLabel: {
    whiteSpace: "nowrap",
  },
  footer: {
    paddingBlock: space._3,
    paddingInline: space._5,
  },
  confirmRow: {
    alignItems: "center",
  },
});
