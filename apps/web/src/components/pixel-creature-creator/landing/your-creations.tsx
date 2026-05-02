"use client";

import * as stylex from "@stylexjs/stylex";
import { useSyncExternalStore } from "react";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { PixelSprite } from "../sprite/pixel-sprite";
import { encodeCreature } from "../state/encode-decode";
import {
  type SavedCreature,
  deleteSavedCreature,
} from "../state/local-storage";
import {
  getSavedSnapshot,
  notifySavedStore,
  subscribeToSavedStore,
} from "../state/saved-store";

interface YourCreationsProps {
  locale: SupportedLocale;
}

const EMPTY_LIST: readonly SavedCreature[] = [];
const getEmptyList = () => EMPTY_LIST;

/**
 * Landing-page "Your creations" strip. Reads the cached saved-creatures
 * snapshot via `useSyncExternalStore` so saves/deletes from anywhere in the
 * app refresh the list without polling. The store caches the parsed list and
 * only invalidates on explicit notify or cross-tab `storage` events — that
 * reference stability is required for `useSyncExternalStore` to avoid an
 * infinite render loop. Server snapshot is the empty list (saved creatures
 * are only visible after hydration).
 */
export function YourCreations({ locale }: YourCreationsProps) {
  const localePrefix = locale === "en" ? "/en" : "/zh";
  const saved = useSyncExternalStore(
    subscribeToSavedStore,
    getSavedSnapshot,
    getEmptyList,
  );

  const heading = t({ en: "Your creations", zh: "你的创作" });
  const emptyMessage = t({
    en: "Saved creatures appear here.",
    zh: "保存的生物会显示在这里。",
  });
  const emptyHint = t({
    en: "Start designing to fill this shelf.",
    zh: "开始设计来填满这个架子吧。",
  });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const unnamedLabel = t({ en: "Unnamed creature", zh: "未命名生物" });
  const confirmMessage = t({
    en: "Delete this saved creature?",
    zh: "确定要删除这个保存的生物吗？",
  });

  const handleDelete = (entry: SavedCreature) => {
    if (typeof window === "undefined") return;
    if (!window.confirm(confirmMessage)) return;
    deleteSavedCreature(entry.id);
    notifySavedStore();
  };

  return (
    <section css={styles.root} data-testid="your-creations">
      <h2 css={styles.heading}>{heading}</h2>
      {saved.length === 0 ? (
        <div css={styles.empty} data-testid="your-creations-empty">
          <p css={styles.emptyMessage}>{emptyMessage}</p>
          <p css={styles.emptyHint}>{emptyHint}</p>
        </div>
      ) : (
        <ul css={styles.list}>
          {saved.map((entry) => {
            const hash = encodeCreature(entry.def);
            const href = `${localePrefix}/pixel-creature-creator/c#${hash}`;
            const displayName =
              entry.def.name.trim().length > 0 ? entry.def.name : unnamedLabel;
            return (
              <li
                key={entry.id}
                css={styles.item}
                data-testid="your-creations-item"
              >
                <a href={href} css={styles.thumbLink} aria-label={displayName}>
                  <span css={styles.thumb} aria-hidden="true">
                    <PixelSprite def={entry.def} scale={3} paused />
                  </span>
                  <span css={styles.itemName}>{displayName}</span>
                </a>
                <button
                  type="button"
                  css={styles.deleteButton}
                  onClick={() => {
                    handleDelete(entry);
                  }}
                  data-testid="your-creations-delete"
                  aria-label={`${deleteLabel}: ${displayName}`}
                >
                  {deleteLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    width: "100%",
  },
  heading: {
    margin: 0,
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.backgroundRaised,
    borderRadius: "12px",
    color: color.textMuted,
    textAlign: "center",
  },
  emptyMessage: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  emptyHint: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: space._2,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space._1,
    padding: space._2,
    backgroundColor: color.backgroundRaised,
    borderRadius: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
  },
  thumbLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._0,
    color: color.textMain,
    textDecoration: "none",
    borderRadius: "8px",
    paddingBlock: space._1,
    transitionProperty: "background-color, transform",
    transitionDuration: "120ms",
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    outlineOffset: "2px",
  },
  thumb: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "5rem",
  },
  itemName: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxInlineSize: "100%",
  },
  deleteButton: {
    paddingBlock: space._0,
    paddingInline: space._2,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    color: color.textMuted,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "999px",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    cursor: "pointer",
    alignSelf: "center",
  },
});
