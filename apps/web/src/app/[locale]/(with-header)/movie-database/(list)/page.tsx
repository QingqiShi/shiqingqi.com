import * as stylex from "@stylexjs/stylex";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { ratio, space } from "@tuja/ui/tokens.stylex";
import { connection } from "next/server";
import { Suspense } from "react";
import * as tmdbServerFunctions from "#src/_generated/tmdb-server-functions.ts";
import { DotGridBackground } from "#src/components/ai-chat/dot-grid-background.tsx";
import { SuggestionChips } from "#src/components/ai-chat/suggestion-chips.tsx";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import { Filters } from "#src/components/movie-database/filters.tsx";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { HeroSection } from "#src/components/movie-database/hero-section.tsx";
import { HeroVisibilityProvider } from "#src/components/movie-database/hero-visibility-provider.tsx";
import { InlineChatSwitch } from "#src/components/movie-database/inline-chat-switch.tsx";
import { InlineChatView } from "#src/components/movie-database/inline-chat-view.tsx";
import { MediaFiltersProvider } from "#src/components/movie-database/media-filters-provider.tsx";
import { MediaList } from "#src/components/movie-database/media-list.tsx";
import { noop } from "#src/components/movie-database/noop.ts";
import { readMediaFiltersSearchParams } from "#src/components/movie-database/read-media-filters-search-params.ts";
import { TrendingRows } from "#src/components/movie-database/trending-rows.tsx";
import { RetryableErrorBoundary } from "#src/components/shared/retryable-error-boundary.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { getQueryClient } from "#src/utils/get-query-client.ts";
import { configurationQuery } from "#src/utils/tmdb-queries/configuration-query.ts";
import { genresQuery } from "#src/utils/tmdb-queries/genres-query.ts";
import { mediaListQuery } from "#src/utils/tmdb-queries/media-list-query.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { toURLSearchParams } from "./to-url-search-params";

const SKELETON_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  key: `skeleton-${String(i)}`,
  delay: i * 100,
}));

export default async function Page(
  props: PageProps & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  },
) {
  await connection();
  const params = await props.params;
  const validatedLocale: SupportedLocale = validateLocale(params.locale);
  const searchParams = await props.searchParams;

  const { genres, matchMode, sort, mediaType, view } =
    readMediaFiltersSearchParams(toURLSearchParams(searchParams));

  const queryClient = getQueryClient();
  queryClient.query(configurationQuery(tmdbServerFunctions)).catch(noop);
  queryClient
    .query(
      genresQuery(
        { type: mediaType, language: validatedLocale },
        tmdbServerFunctions,
      ),
    )
    .catch(noop);
  queryClient
    .infiniteQuery(
      mediaListQuery(
        {
          type: mediaType,
          page: 1,
          language: validatedLocale,
          genres,
          matchMode,
          sort,
        },
        tmdbServerFunctions,
      ),
    )
    .catch(noop);

  const suggestions = [
    t({
      en: "Find me a feel-good movie to watch tonight",
      zh: "帮我找一部今晚看的治愈系电影",
    }),
    t({
      en: "Where can I stream the latest trending shows?",
      zh: "最近的热门剧在哪里可以看？",
    }),
    t({
      en: "Show me the spicy reviews for the latest releases",
      zh: "给我看看最近上映的片子的辛辣影评",
    }),
    t({
      en: "Who starred in that space movie from last year?",
      zh: "去年那部太空电影是谁演的？",
    }),
  ];

  return (
    <RetryableErrorBoundary
      message={t({
        en: "Something went wrong loading the movies.",
        zh: "加载电影时出错了。",
      })}
    >
      <HeroVisibilityProvider>
        <main>
          <InlineChatSwitch
            chatBackground={<DotGridBackground />}
            browseContent={
              <>
                <HeroSection />
                <TrendingRows
                  locale={validatedLocale}
                  limit={14}
                  inset="standalone"
                  linkToDetails
                  movieTitle={t({
                    en: "Trending movies this week",
                    zh: "本周热门电影",
                  })}
                  tvShowTitle={t({
                    en: "Trending TV shows this week",
                    zh: "本周热门电视剧",
                  })}
                />
                <Suspense
                  fallback={
                    <>
                      <FiltersSkeleton locale={validatedLocale} />
                      <Grid>
                        {SKELETON_ITEMS.map((item) => (
                          <Skeleton
                            key={item.key}
                            css={styles.skeleton}
                            delay={item.delay}
                          />
                        ))}
                      </Grid>
                    </>
                  }
                >
                  <HydrationBoundary state={dehydrate(queryClient)}>
                    <MediaFiltersProvider
                      defaultFilters={{
                        genres,
                        matchMode,
                        sort,
                        mediaType,
                        view,
                      }}
                    >
                      <Suspense
                        fallback={<FiltersSkeleton locale={validatedLocale} />}
                      >
                        <Filters
                          mobileButtonLabel={t({ en: "Refine", zh: "筛选" })}
                        />
                      </Suspense>
                      <MediaList initialPage={1} />
                    </MediaFiltersProvider>
                  </HydrationBoundary>
                </Suspense>
              </>
            }
            chatContent={
              <InlineChatView
                emptyState={
                  <div css={styles.welcomeContainer}>
                    <SuggestionChips
                      groupLabel={t({
                        en: "Suggested prompts",
                        zh: "推荐提问",
                      })}
                      suggestions={suggestions}
                    />
                    <TrendingRows
                      locale={validatedLocale}
                      limit={10}
                      inset="chat"
                      movieTitle={t({ en: "Trending movies", zh: "热门电影" })}
                      tvShowTitle={t({
                        en: "Trending TV shows",
                        zh: "热门电视剧",
                      })}
                    />
                  </div>
                }
                messagesLabel={t({
                  en: "Chat messages",
                  zh: "聊天消息",
                })}
                typingIndicatorLabel={t({
                  en: "AI is thinking…",
                  zh: "AI 正在思考…",
                })}
                scrollToBottomLabel={t({
                  en: "Scroll to bottom",
                  zh: "滚动到底部",
                })}
                errorLabel={t({
                  en: "Something went wrong. Try again.",
                  zh: "出了点问题，请重试。",
                })}
                placeholder={t({
                  en: "Ask about movies and TV shows...",
                  zh: "询问关于电影和电视剧的问题...",
                })}
                sendLabel={t({ en: "Send message", zh: "发送消息" })}
                stopLabel={t({ en: "Stop generating", zh: "停止生成" })}
                removeAttachmentLabel={t({
                  en: "Remove attachment",
                  zh: "移除附件",
                })}
              />
            }
          />
        </main>
      </HeroVisibilityProvider>
    </RetryableErrorBoundary>
  );
}

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
  welcomeContainer: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    width: "100%",
  },
});
