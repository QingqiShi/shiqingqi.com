"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import type { SupportedLocale } from "@tuja/i18n/types";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import type { PropsWithChildren, ReactNode } from "react";
import {
  DATA_HERO_REFINE_BUTTON,
  useHeroVisibility,
} from "#src/movie-database/browse/hero-visibility-context.ts";
import { refineRoom, refineWord } from "./refine-label.stylex.ts";
import { useMediaFilters } from "./use-media-filters";

interface MobileFiltersButtonProps {
  menuContent?: ReactNode;
}

export function MobileFiltersButton({
  menuContent,
  children,
}: PropsWithChildren<MobileFiltersButtonProps>) {
  const { canReset, genres } = useMediaFilters();
  const { isHeroInputVisible } = useHeroVisibility();
  const hasCount = genres.size > 0;
  const room = wordRoom[useLocale()][hasCount ? "withCount" : "alone"];
  const isIconOnly = room !== null && !hasCount;

  return (
    <div
      css={[styles.wrapper, isHeroInputVisible && styles.pushedRight]}
      {...{ [DATA_HERO_REFINE_BUTTON]: "" }}
    >
      <MenuButton
        menuContent={menuContent}
        buttonProps={{
          icon: (
            <span css={[flex.center, isIconOnly && styles.loneGlyph]}>
              <FunnelIcon weight="bold" role="presentation" />
            </span>
          ),
          type: "button",
          isActive: canReset,
          css: room && [hidesWord[room], isIconOnly && styles.square],
        }}
        // The panel is nearly bar-wide and this trigger sits mid-row (the chat
        // input and AI button follow it), so anchoring the panel to the
        // trigger's corner would hang most of it off the inline-start edge.
        position="sheet"
        popupRole="group"
      >
        <span css={styles.word}>{children}</span>
        {hasCount ? ` (${String(genres.size)})` : null}
      </MenuButton>
    </div>
  );
}

const styles = stylex.create({
  wrapper: {
    display: "flex",
    // Deliberately no `will-change: transform` here, even though
    // `HeroVisibilityProvider` morphs this element: it would make the wrapper a
    // containing block for positioned descendants, which both shrinks
    // MenuButton's viewport-filling backdrop to the button's own box — leaving
    // the open panel undismissable — and collapses the sheet onto the button
    // instead of the filters bar. The trigger still gets its own compositing
    // layer from MenuButton's internal `FixedContainerContent`, and the browser
    // promotes this element for the duration of the morph animation anyway.
  },
  pushedRight: {
    marginInlineStart: { default: "auto", [breakpoints.md]: "unset" },
  },

  // The AI button sits out of flow at the end of the bar, so the trigger must
  // end before it. On a screen too narrow for that, the trigger shows only
  // its icon and its count. The word stays in the accessibility tree, so the
  // trigger and the panel keep their name.
  word: {
    position: refineWord.position,
    clipPath: refineWord.clipPath,
  },
  // With no count, only the icon is left, so the trigger takes the square
  // shape of an icon-only Button, with its glyph size. Each default is the
  // value that Button gives an icon with a label.
  square: {
    inlineSize: { default: null, [refineRoom.shorter]: buttonTokens.height },
    gap: { default: controlSize._2, [refineRoom.shorter]: 0 },
    paddingInlineStart: { default: controlSize._2, [refineRoom.shorter]: 0 },
    paddingInlineEnd: {
      default: buttonTokens.paddingInline,
      [refineRoom.shorter]: 0,
    },
  },
  loneGlyph: {
    fontSize: { default: null, [refineRoom.shorter]: controlSize._4 },
  },
});

const hidesWord = stylex.create({
  shorter: {
    [refineWord.position]: { default: null, [refineRoom.shorter]: "absolute" },
    [refineWord.clipPath]: {
      default: null,
      [refineRoom.shorter]: "inset(50%)",
    },
  },
  longer: {
    [refineWord.position]: { default: null, [refineRoom.longer]: "absolute" },
    [refineWord.clipPath]: {
      default: null,
      [refineRoom.longer]: "inset(50%)",
    },
  },
});

// The width under which each label has no room for its word. The Chinese
// label is shorter: without a count it fits at 320px, the narrowest screen.
const wordRoom = {
  en: { alone: "shorter", withCount: "longer" },
  zh: { alone: null, withCount: "shorter" },
} satisfies Record<
  SupportedLocale,
  { alone: "shorter" | null; withCount: keyof typeof hidesWord | null }
>;
