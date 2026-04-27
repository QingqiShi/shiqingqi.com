import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import { FixedContainerContent } from "../shared/fixed-container-content";
import { CollapsedChatButton } from "./collapsed-chat-button";
import { CollapsedChatInput } from "./collapsed-chat-input";
import { FiltersContainer } from "./filters-container";
import { GenreFilter } from "./genre-filter";
import { GenreFilterButton } from "./genre-filter-button";
import { MediaTypeToggle } from "./media-type-toggle";
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
          <TmdbCredit position="topLeft" />
        </>
      }
      mobileChildren={
        <>
          <MediaTypeToggle shortLabels />
          <MobileFiltersButton
            menuContent={
              <div css={[flex.wrap, styles.mobileMenuContent]}>
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
    width: `calc(100dvw - (${space._3} * 2))`,
    maxHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
    willChange: "transform",
  },
  content: {
    display: "flex",
    gap: space._1,
  },
});
