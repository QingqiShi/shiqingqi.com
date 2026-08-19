import * as stylex from "@stylexjs/stylex";
import { FixedContainerContent } from "@tuja/ui/components/fixed-container-content";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { CollapsedChatButton } from "./collapsed-chat-button";
import { CollapsedChatInput } from "./collapsed-chat-input";
import { FiltersContainer } from "./filters-container";
import { GenreFilter } from "./genre-filter";
import { GenreFilterButton } from "./genre-filter-button";
import { MediaTypeToggle } from "./media-type-toggle";
import { MediaViewToggle } from "./media-view-toggle";
import { MobileFiltersButton } from "./mobile-filters-button";
import { ResetFilter } from "./reset-filter";
import { SortFilter } from "./sort-filter";
import { TmdbCredit, TmdbCreditInline } from "./tmdb-credit";

interface FiltersProps {
  mobileButtonLabel: string;
}

export function Filters({ mobileButtonLabel }: FiltersProps) {
  return (
    <FiltersContainer
      trailingContent={
        <>
          <CollapsedChatInput
            placeholder={t({
              en: "Ask about movies and TV shows...",
              zh: "询问关于电影和电视剧的问题...",
            })}
            sendLabel={t({ en: "Send message", zh: "发送消息" })}
          />
          <CollapsedChatButton
            label={t({ en: "AI", zh: "AI" })}
            ariaLabel={t({
              en: "Ask AI about movies and TV shows",
              zh: "向AI询问电影和电视剧",
            })}
          />
        </>
      }
      desktopChildren={
        <>
          <FixedContainerContent>
            <MediaTypeToggle />
          </FixedContainerContent>
          <GenreFilterButton />
          <FixedContainerContent css={styles.content}>
            <SortFilter hideLabel />
            <ResetFilter hideLabel />
          </FixedContainerContent>
          <FixedContainerContent>
            <MediaViewToggle iconOnly hideLabel />
          </FixedContainerContent>
          {/* Anchored to the trigger's inline-end so the Attribution grows back
              over the bar. Its trigger sits mid-row, so growing the other way
              ran a 500px panel past the inline-end edge of every viewport under
              ~1200px — and a closed MenuButton popup is still laid out, so that
              widened the page into a sideways scroll whether or not anyone
              opened it. */}
          <TmdbCredit position="topRight" />
        </>
      }
      mobileChildren={
        <>
          <MediaTypeToggle shortLabels />
          <MobileFiltersButton
            menuContent={
              <div css={[flex.wrap, styles.mobileMenuContent]}>
                <MediaViewToggle bright />
                <SortFilter bright />
                <GenreFilter />
                <ResetFilter bright />
                <TmdbCreditInline />
              </div>
            }
          >
            {mobileButtonLabel}
          </MobileFiltersButton>
        </>
      }
    />
  );
}

const styles = stylex.create({
  mobileMenuContent: {
    gap: space._4,
    padding: space._2,
    // No width, height cap, or scrolling of its own: the `sheet` popup sizes
    // itself to the filters bar and caps its own block size against wherever
    // that bar currently sits, which is the part this could only guess at. The
    // compositing hint went with the scrolling — the popup animates a surface
    // of its own, and this content only fades.
  },
  content: {
    display: "flex",
    gap: space._1,
  },
});
