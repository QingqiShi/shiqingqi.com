"use client";

import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useSyncExternalStore } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { encodeCreature } from "#src/pixel-creature-creator/creature/encode-creature.ts";
import { getSavedCreaturesSnapshot } from "#src/pixel-creature-creator/creature/get-saved-creatures-snapshot.ts";
import { notifySavedCreaturesChanged } from "#src/pixel-creature-creator/creature/notify-saved-creatures-changed.ts";
import { deleteSavedCreature } from "#src/pixel-creature-creator/creature/saved-creatures/delete-saved-creature.ts";
import type { SavedCreature } from "#src/pixel-creature-creator/creature/saved-creatures/types.ts";
import { subscribeSavedCreatures } from "#src/pixel-creature-creator/creature/subscribe-saved-creatures.ts";
import { PixelSprite } from "#src/pixel-creature-creator/sprite/pixel-sprite.tsx";

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
    subscribeSavedCreatures,
    getSavedCreaturesSnapshot,
    getEmptyList,
  );

  const heading = t({ en: "Your creations", zh: "你的创作" });
  const emptyMessage = t({
    en: "Saved creatures appear on this shelf.",
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
    notifySavedCreaturesChanged();
  };

  return (
    <section css={[stack.item, styles.root]} data-testid="your-creations">
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
                css={[cardSurface.base, styles.item]}
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
    width: "100%",
  },
  heading: {
    margin: 0,
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
    color: color.fg,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurface,
    borderRadius: "12px",
    cornerShape: "squircle",
    color: color.fgMuted,
    textAlign: "center",
  },
  emptyMessage: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.fg,
  },
  emptyHint: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.fgMuted,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: rhythm.item,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: rhythm.tight,
    padding: space._2,
  },
  thumbLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    color: color.fg,
    textDecoration: "none",
    borderRadius: "8px",
    cornerShape: "squircle",
    paddingBlock: space._1,
    transitionProperty: "background-color, transform",
    transitionDuration: "120ms",
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgControlHover,
      ":focus-visible": color.bgControlHover,
    },
    outlineOffset: border.size_2,
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
    color: color.fg,
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
      ":hover": color.bgControlHover,
      ":focus-visible": color.bgControlHover,
    },
    color: color.fgMuted,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "999px",
    cornerShape: "round",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    cursor: "pointer",
    alignSelf: "center",
  },
});
