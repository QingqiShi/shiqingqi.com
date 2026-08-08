"use client";

import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/ssr/BookmarkSimple";
import { LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import { MonitorPlayIcon } from "@phosphor-icons/react/dist/ssr/MonitorPlay";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { Heading } from "@tuja/ui/components/heading";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { Section } from "@tuja/ui/components/section";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useId, useState } from "react";
import { t } from "#src/i18n.ts";
import { AnnotatedRegion } from "./annotated-region.tsx";
import { useMovies } from "./movie-detail-data.ts";
import {
  CastPanel,
  OverviewPanel,
  SimilarPanel,
} from "./movie-detail-panels.tsx";
import { TrailerOverlay } from "./trailer-overlay.tsx";
import { TypesetPoster } from "./typeset-poster.tsx";

type DetailView = "overview" | "cast" | "similar";

interface MovieDetailScreenProps {
  /** Mirrors the page's annotation switch; drawn by each `AnnotatedRegion`. */
  annotated: boolean;
}

/**
 * A movie-details screen composed entirely from `@tuja/ui`.
 *
 * Read it as the answer to a question the reference pages can't settle
 * individually: what does the system look like carrying a whole screen? Every
 * surface, control, rule, and type step below comes from a component, a
 * composable style object, or a token — there is no local colour, no local font
 * stack, and no bespoke focus ring anywhere in this file. What is local is
 * arrangement: the hero grid, the rating dial's dimensions, and the fact grid,
 * which is exactly the split `DESIGN.md` argues for (the system owns behaviour
 * and appearance, the consumer owns layout).
 *
 * The data is invented and hard-coded. The screen makes no TMDB request, so it
 * renders identically with no API key, no network, and no vector index.
 */
export function MovieDetailScreen({ annotated }: MovieDetailScreenProps) {
  const movies = useMovies();
  const [movieId, setMovieId] = useState(movies[0].id);
  const [view, setView] = useState<DetailView>("overview");
  const [watchlisted, setWatchlisted] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [region, setRegion] = useState("GB");
  const panelId = useId();

  const movie = movies.find((entry) => entry.id === movieId) ?? movies[0];
  const similar = movies.filter((entry) => entry.id !== movie.id);

  const viewOptions: { value: DetailView; label: string }[] = [
    { value: "overview", label: t({ en: "Overview", zh: "简介" }) },
    { value: "cast", label: t({ en: "Cast", zh: "演员" }) },
    { value: "similar", label: t({ en: "Similar", zh: "相似影片" }) },
  ];
  const activeViewLabel =
    viewOptions.find((option) => option.value === view)?.label ?? "";

  // Provider names stay untranslated — they are brands, and TMDB returns them
  // unlocalized too. Keyed by region so the Select actually drives something:
  // a region picker whose choice changes nothing documents a control that
  // doesn't work.
  const providersByRegion: Record<string, string[]> = {
    GB: ["Northlight+", "Reel Archive", "Tidewater TV"],
    US: ["Northlight+", "Fathom Channel"],
    JP: ["Reel Archive", "Kaigan Stream"],
  };
  const providers = providersByRegion[region] ?? [];
  const regionOptions = [
    { value: "GB", label: t({ en: "United Kingdom", zh: "英国" }) },
    { value: "US", label: t({ en: "United States", zh: "美国" }) },
    { value: "JP", label: t({ en: "Japan", zh: "日本" }) },
  ];

  const shareItems = [
    {
      icon: <LinkSimpleIcon weight="bold" />,
      label: t({ en: "Copy link", zh: "复制链接" }),
    },
    {
      icon: <SparkleIcon weight="bold" />,
      label: t({ en: "Ask the AI about it", zh: "向 AI 询问" }),
    },
    {
      icon: <MonitorPlayIcon weight="bold" />,
      label: t({ en: "Embed", zh: "嵌入" }),
    },
  ];

  const watchlistLabel = watchlisted
    ? t({ en: "In your watchlist", zh: "已在待看清单" })
    : t({ en: "Add to watchlist", zh: "加入待看清单" });
  const reviewSummaryLabel = t({ en: "Review summary", zh: "评论摘要" });
  const whereToWatchLabel = t({ en: "Where to watch", zh: "观看渠道" });
  const detailsLabel = t({ en: "Details", zh: "详情" });

  // Both are built here rather than stored per Movie, so the eyebrow and the
  // fact list cannot disagree with each other or with the poster: each value is
  // written once in `movie-detail-data.ts` and read from there by all three.
  const meta = [movie.year, movie.runtime, movie.language].join(" · ");
  const facts = [
    { term: t({ en: "Director", zh: "导演" }), value: movie.director },
    { term: t({ en: "Studio", zh: "制片公司" }), value: movie.studio },
    {
      term: t({ en: "Original language", zh: "原始语言" }),
      value: movie.language,
    },
    {
      term: t({ en: "Release date", zh: "上映日期" }),
      value: movie.releaseDate,
    },
    { term: t({ en: "Runtime", zh: "片长" }), value: movie.runtime },
  ];

  // One flag, not two. The notice only ever mattered while `watchlisted` was
  // true, so tracking "dismissed" separately meant resetting it as a side effect
  // of every toggle; opening it with the add and closing it with the remove says
  // the same thing without the second source of truth.
  const toggleWatchlist = () => {
    const next = !watchlisted;
    setWatchlisted(next);
    setNoticeOpen(next);
  };

  // Picking a Similar Movie loads it and returns to the Overview, the way
  // opening a details page from a row of them does. The view change is the
  // visible receipt: the panel under the pointer swaps, so the click is
  // confirmed without moving the viewport out from under anyone.
  const selectMovie = (nextId: string) => {
    setMovieId(nextId);
    setView("overview");
    setWatchlisted(false);
    setNoticeOpen(false);
  };

  return (
    <div css={[cardSurface.base, styles.screen]}>
      <AnnotatedRegion
        annotated={annotated}
        label={t({ en: "Hero", zh: "头部" })}
        composes="Heading · Text · Badge · Button · MenuButton · Callout · Overlay"
      >
        <div css={styles.hero}>
          <TypesetPoster
            title={movie.title}
            studio={movie.studio}
            year={movie.year}
            credit={movie.director}
            lead
            css={styles.heroPoster}
          />
          <div css={styles.identity}>
            <div css={styles.controlRow}>
              <Badge variant="accent">{t({ en: "Movie", zh: "电影" })}</Badge>
              <Text as="span" variant="caption" tone="subtle" numeric>
                {meta}
              </Text>
            </div>
            <Heading level={3} variant="h1" wrap="balance">
              {movie.title}
            </Heading>
            <Text tone="muted" wrap="pretty" css={styles.tagline}>
              {movie.tagline}
            </Text>
          </div>

          <div css={styles.heroRest}>
            {/*
              Badges, not Chips. The system's own rule is that a Chip renders a
              control and a Badge renders a label — "if it can't be clicked, it's
              a Badge" — and on a screen with no data layer behind it a genre has
              nowhere to navigate to. Dressing these as controls would document
              the wrong half of that rule on the page whose subject is composing
              correctly.
            */}
            <div css={styles.badgeRow}>
              {movie.genres.map((genre) => (
                <Badge key={genre} size="small">
                  {genre}
                </Badge>
              ))}
            </div>

            <div css={styles.rating}>
              {/*
                The dial is the one figure on the screen a reader takes in
                without reading, so it is drawn as decoration and the Rating is
                stated in full beside it. Labelling both would announce the same
                score twice.
              */}
              <div css={[corner.radius_round, styles.dial]} aria-hidden="true">
                <span css={styles.dialScore}>{movie.rating}</span>
                <span css={styles.dialScale}>/10</span>
              </div>
              <div css={styles.ratingText}>
                <Text as="span" variant="bodySmall" weight="medium">
                  {t({ en: "Rating", zh: "评分" })}
                </Text>
                <Text as="span" variant="caption" tone="subtle" numeric>
                  {movie.ratingLabel}
                </Text>
              </div>
            </div>

            <div css={styles.controlRow}>
              <Button
                variant="primary"
                icon={<PlayIcon weight="fill" />}
                onClick={() => {
                  setTrailerOpen(true);
                }}
              >
                {t({ en: "Watch trailer", zh: "观看预告片" })}
              </Button>
              <Button
                variant="outline"
                isActive={watchlisted}
                icon={
                  <BookmarkSimpleIcon weight={watchlisted ? "fill" : "bold"} />
                }
                onClick={toggleWatchlist}
              >
                {watchlistLabel}
              </Button>
              <MenuButton
                buttonProps={{
                  variant: "outline",
                  icon: <ShareNetworkIcon weight="bold" />,
                }}
                // The default anchor, which grows the popup back across the
                // trigger rather than past it. Share is the last control in the
                // row, so there is always room on that side — anchoring the other
                // way fits at 1440px and hangs 100px off the edge at 390px, and a
                // closed MenuButton is hidden rather than unmounted, so that
                // overhang would widen the page whether or not anyone opened it.
                menuContent={
                  <div css={styles.menu}>
                    {/*
                      No MenuLabel here: MenuButton already titles the popup with
                      the trigger's own label, and a caption reading "Share this
                      movie" under a heading reading "Share" is the same words
                      twice.

                      `role="menuitem"` is all MenuButton needs to adopt these as
                      its roving-focus targets — it finds them in the popup and
                      moves focus to the first one on open. The items are ordinary
                      Buttons at the config layer; only their alignment is local.
                    */}
                    {shareItems.map((item) => (
                      <Button
                        key={item.label}
                        role="menuitem"
                        variant="ghost"
                        icon={item.icon}
                        css={styles.menuItem}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                }
              >
                {t({ en: "Share", zh: "分享" })}
              </MenuButton>
            </div>

            {noticeOpen ? (
              <Callout
                variant="success"
                title={t({
                  en: "Added to your watchlist",
                  zh: "已加入待看清单",
                })}
                onDismiss={() => {
                  setNoticeOpen(false);
                }}
                dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
              >
                {t({
                  en: "Nothing left this page — the exemplar has no account and no server.",
                  zh: "没有任何数据离开本页面——本示例既没有账号也没有服务端。",
                })}
              </Callout>
            ) : null}
          </div>
        </div>
      </AnnotatedRegion>

      <Divider />

      {/*
        One column, because the page it sits on caps at `measure.reading` and a
        rail beside a 400px main column is narrower than the Select in its own
        header. The two reference blocks pair off into a row of their own at
        `md` instead: they are short, they are scanned rather than read, and
        side by side they stop the fact list from running the screen on for
        another half-metre. DOM order matches visual order at both widths, so
        nothing is reordered out from under the keyboard or a screen reader.
      */}
      <div css={styles.body}>
        <div css={styles.bodyColumn}>
          <AnnotatedRegion
            annotated={annotated}
            label={t({ en: "Views", zh: "视图" })}
            composes="SegmentedControl · Text · Avatar · cardSurface · transition"
          >
            <div css={styles.views}>
              <SegmentedControl
                aria-label={t({ en: "Detail view", zh: "详情视图" })}
                aria-controls={panelId}
                options={viewOptions}
                value={view}
                onChange={setView}
                size="sm"
              />
              {/*
                A named group rather than a live region. The panel is what the
                switch above controls, so it needs an accessible name that says
                which view is showing and an id the group can point at; announcing
                the whole synopsis on every switch would read the page aloud three
                times to someone who only wanted to compare the tabs.

                One panel mounted at a time — see `movie-detail-panels.tsx` for
                why each is its own component.
              */}
              <div
                id={panelId}
                role="group"
                aria-label={activeViewLabel}
                css={fill.inline}
              >
                {view === "overview" ? (
                  <OverviewPanel overview={movie.overview} />
                ) : null}
                {view === "cast" ? <CastPanel cast={movie.cast} /> : null}
                {view === "similar" ? (
                  <SimilarPanel movies={similar} onSelect={selectMovie} />
                ) : null}
              </div>
            </div>
          </AnnotatedRegion>

          <AnnotatedRegion
            annotated={annotated}
            label={reviewSummaryLabel}
            composes="Disclosure · Badge · Text"
          >
            <Disclosure
              variant="card"
              // Open on arrival. The summary is content the screen is making a
              // point of having, not an aside to be dug out, and it is also what
              // brings the main column and the rail to roughly the same depth.
              defaultOpen
              summary={reviewSummaryLabel}
              icon={<SparkleIcon weight="bold" />}
              trailing={
                <Badge variant="neutral" size="small">
                  {`${t({ en: "Spiciness", zh: "辛辣度" })} ${String(movie.spiciness)}`}
                </Badge>
              }
            >
              <div css={styles.review}>
                <Text wrap="pretty">{movie.reviewSummary}</Text>
                <Text variant="caption" tone="subtle">
                  {t({
                    en: "Generated from viewer reviews. Spiciness sets how opinionated the summary is, from 1 to 5.",
                    zh: "根据观众评论生成。辛辣度（1 至 5）决定摘要的观点鲜明程度。",
                  })}
                </Text>
              </div>
            </Disclosure>
          </AnnotatedRegion>
        </div>

        <div css={styles.reference}>
          <AnnotatedRegion
            annotated={annotated}
            label={whereToWatchLabel}
            composes="Section · Select · Badge"
          >
            <Section
              level={4}
              divider
              title={whereToWatchLabel}
              actions={
                <Select
                  label={t({ en: "Region", zh: "地区" })}
                  labelHidden
                  size="sm"
                  options={regionOptions}
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value);
                  }}
                />
              }
            >
              <div css={styles.badgeRow}>
                {providers.map((provider) => (
                  <Badge
                    key={provider}
                    size="small"
                    icon={<MonitorPlayIcon weight="bold" />}
                  >
                    {provider}
                  </Badge>
                ))}
              </div>
            </Section>
          </AnnotatedRegion>

          <AnnotatedRegion
            annotated={annotated}
            label={detailsLabel}
            composes="Section · Text"
          >
            <Section level={4} divider title={detailsLabel}>
              {/*
                A real definition list, so the term/value pairing survives being
                read out linearly. `Text` renders `p`, `span`, or `div` only —
                the `dt`/`dd` elements the list needs are structure, not a type
                step, so they are declared here and `Text` supplies the two
                steps inside them.
              */}
              <dl css={styles.facts}>
                {facts.map((fact) => (
                  <div key={fact.term} css={styles.fact}>
                    <dt css={styles.factLine}>
                      <Text as="span" variant="overline" tone="subtle">
                        {fact.term}
                      </Text>
                    </dt>
                    <dd css={styles.factLine}>
                      <Text as="span" variant="bodySmall">
                        {fact.value}
                      </Text>
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          </AnnotatedRegion>
        </div>
      </div>

      <TrailerOverlay
        title={movie.title}
        studio={movie.studio}
        isOpen={trailerOpen}
        onClose={() => {
          setTrailerOpen(false);
        }}
      />
    </div>
  );
}

const styles = stylex.create({
  // Only what `cardSurface.base` does not already give the screen. The surface,
  // the hairline and the radius come from the system's shared skin, composed onto
  // the element at the callsite — restating those five declarations here would
  // have left the one file whose thesis is "no local surfaces" holding the app's
  // only private copy of the card surface, silently stranded the next time the
  // skin changes.
  screen: {
    display: "flex",
    flexDirection: "column",
    gap: { default: space._5, [breakpoints.md]: space._6 },
    padding: { default: space._3, [breakpoints.md]: space._5 },
  },
  // The poster sits beside the title lockup at every width, and the wide blocks
  // — Genres, the Rating, the actions — drop below both on a phone. A poster
  // stacked above them instead held a 200px column of a 324px row and left the
  // rest of that row empty, which is the one shape `DESIGN.md` rules out: too
  // wide to read as a margin, too narrow to hold anything.
  hero: {
    display: "grid",
    gridTemplateColumns: {
      // Wide enough that the longest single-word title in the set sets on one
      // line inside the plate. Narrower and "Northbound" breaks after the "n".
      default: "minmax(0, 8.5rem) minmax(0, 1fr)",
      [breakpoints.md]: "auto minmax(0, 1fr)",
    },
    gridTemplateAreas: {
      default: '"poster identity" "rest rest"',
      [breakpoints.md]: '"poster identity" "poster rest"',
    },
    // The plate is taller than the type beside it, and a spanning item pays for
    // that height out of both rows — which opened a gap between the tagline and
    // the Genres twice the size of every other gap in the column. Give the first
    // row its content and let the second row carry the slack, under its content
    // rather than inside it.
    gridTemplateRows: { [breakpoints.md]: "min-content 1fr" },
    // The column gap separates the plate from the type; the row gap is the
    // hero's own rhythm, so the Genres sit under the tagline at the same step
    // the blocks below them use.
    columnGap: { default: space._3, [breakpoints.md]: space._5 },
    rowGap: space._4,
    alignItems: "start",
  },
  // Capped rather than fluid from `md` up: a full-bleed 2:3 poster is 585px tall
  // on a phone and pushes the title, the Rating, and every action below the fold,
  // so the plate holds a proportion of the row instead of all of it.
  //
  // A layout dimension rather than a spacing step, so it is stated in `rem` — the
  // `space` scale has nothing between 10rem and 15rem, and 10rem is too narrow to
  // set the title. Paired with the responsive type step in `typeset-poster.tsx`:
  // the plate widens at `lg` exactly where the title steps up.
  heroPoster: {
    gridArea: "poster",
    inlineSize: {
      default: "100%",
      [breakpoints.md]: "12.5rem",
      [breakpoints.lg]: "15rem",
    },
  },
  // Tighter than the blocks below it: the eyebrow, the title, and the tagline
  // are one unit of information and read as one only while they sit closer to
  // each other than to the Genres underneath.
  identity: {
    gridArea: "identity",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    minInlineSize: 0,
  },
  heroRest: {
    gridArea: "rest",
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    minInlineSize: 0,
  },
  // Shared by the eyebrow (Badge plus the meta line) and the actions row: both
  // are a wrapping row of controls at the same rhythm, and two byte-identical
  // declarations drift the moment one of them is nudged.
  controlRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
  },
  tagline: {
    maxInlineSize: "30rem",
  },
  // Shared by the Genres and the watch providers — a tighter gap than
  // `controlRow`, because these are labels rather than controls.
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
  },
  rating: {
    display: "flex",
    alignItems: "center",
    gap: space._3,
  },
  // Local geometry, system values: the diameter and the ring width are this
  // screen's own decisions, while the surface, the border colour, the radius,
  // and both type steps are tokens.
  dial: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: space._9,
    blockSize: space._9,
    borderWidth: border.size_2,
    borderStyle: "solid",
    borderColor: color.accentBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  dialScore: {
    color: color.textMain,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_0,
    fontVariantNumeric: "tabular-nums",
  },
  dialScale: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWide,
  },
  ratingText: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    padding: space._2,
    inlineSize: space._13,
  },
  // Menu items read as a list, so their labels line up at the inline start
  // instead of centring the way a standalone Button does.
  menuItem: {
    justifyContent: "flex-start",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: { default: space._5, [breakpoints.md]: space._6 },
  },
  bodyColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    minInlineSize: 0,
  },
  // Stacked and full width, not a two-up row. Both blocks reflow to whatever
  // they are given, and the availability list is always the shorter of the two,
  // so pairing them left a column of nothing under the Badges. Full width, the
  // fact list below runs as a single strip instead.
  reference: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
  views: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._4,
    inlineSize: "100%",
  },
  // `auto-fill` at the width the longest term needs, so the five facts settle
  // into one strip on a wide screen and two or three rows on a phone without a
  // breakpoint of their own.
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
    gap: space._3,
    margin: 0,
  },
  // A subgrid, so every term shares one row and every value shares the next.
  // As independent columns, one term wrapping to two lines dropped its own value
  // a line below the other four and the strip stopped reading as a strip.
  fact: {
    display: "grid",
    gridTemplateRows: "subgrid",
    gridRow: "span 2",
    gap: space._00,
    minInlineSize: 0,
  },
  // Both the `dt` and the `dd`. The UA's 40px inline indent on `dd` is the one
  // browser default that has to go — the grid already positions the pair — and
  // zeroing the margin on both is the same declaration twice over.
  factLine: {
    margin: 0,
    marginInlineStart: 0,
  },
  review: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
});
