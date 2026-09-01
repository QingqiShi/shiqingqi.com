"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@tuja/ui/components/icon-button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { TextField } from "@tuja/ui/components/text-field";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { Fragment, useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import type { DesignSystemGroupLabels } from "./route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteSections } from "./routes/get-design-system-route-sections.ts";
import { matchesDesignSystemQuery } from "./routes/matches-design-system-query.ts";
import type { DesignSystemPath } from "./routes/types.ts";

export interface OverviewEntry {
  path: DesignSystemPath;
  /** Localized name of the route — the search target and the A–Z sort key. */
  label: string;
  /**
   * The rendered tile. Passed in already built rather than built here so the
   * specimens — two dozen live components and their illustrations — stay on the
   * server and out of this bundle; the browser only ever reorders the nodes.
   */
  tile: ReactNode;
}

/** Ways to arrange the index. Each answers a different "I'm looking for…". */
type Arrangement = "job" | "name";

interface OverviewBrowserProps {
  /** Every route except the overview itself, in registry order. */
  entries: readonly OverviewEntry[];
  /**
   * Entry paths sorted by label. Collated on the server rather than here so the
   * order can't differ between the server render and hydration — `Intl.Collator`
   * is the one sort whose result depends on which ICU is running it.
   */
  alphabeticalOrder: readonly DesignSystemPath[];
  /** The section and category headings. Resolved on the server — see `route-copy/`. */
  groupLabels: DesignSystemGroupLabels;
}

/** One heading and the tiles under it, plus any sub-headed blocks it contains. */
interface OverviewBlock {
  key: string;
  heading: string | null;
  /** Tiles that sit directly under this heading. */
  entries: OverviewEntry[];
  /** Blocks rendered one heading rank down — the categories inside Components. */
  children: { key: string; heading: string; entries: OverviewEntry[] }[];
}

function hasEntries(block: OverviewBlock) {
  return (
    block.entries.length > 0 ||
    block.children.some((child) => child.entries.length > 0)
  );
}

interface BuildBlocksOptions {
  arrangement: Arrangement;
  /** Narrows a path list to the entries that survived the search, in that order. */
  inOrder: (paths: readonly DesignSystemPath[]) => OverviewEntry[];
  groupLabels: DesignSystemGroupLabels;
  alphabeticalOrder: readonly DesignSystemPath[];
}

/** The blocks one arrangement renders, before empty ones are dropped. */
function buildBlocks({
  arrangement,
  inOrder,
  groupLabels,
  alphabeticalOrder,
}: BuildBlocksOptions): OverviewBlock[] {
  if (arrangement === "name") {
    // One unheaded grid: an alphabet is its own heading. Splitting it by initial
    // would make twenty-odd groups, most of them holding a single tile.
    return [
      {
        key: "name",
        heading: null,
        entries: inOrder(alphabeticalOrder),
        children: [],
      },
    ];
  }

  return getDesignSystemRouteSections()
    .filter((section) => section.section !== "overview")
    .map((section) => ({
      key: section.section,
      heading: groupLabels.sections[section.section],
      entries: inOrder(
        section.groups.find((group) => group.category === undefined)?.paths ??
          [],
      ),
      children: section.groups.flatMap((group) =>
        group.category === undefined
          ? []
          : [
              {
                key: group.category,
                heading: groupLabels.categories[group.category],
                entries: inOrder(group.paths),
              },
            ],
      ),
    }));
}

/**
 * The overview index, and the controls that decide how it reads. Grouping by
 * job answers "what do I need for this?" and nothing else, so the same tiles
 * are also offered A–Z, with a search across both arrangements.
 *
 * Client-side, so switching is instant and the page stays statically rendered;
 * the tiles themselves arrive as server-rendered nodes.
 */
export function OverviewBrowser({
  entries,
  alphabeticalOrder,
  groupLabels,
}: OverviewBrowserProps) {
  const [arrangement, setArrangement] = useState<Arrangement>("job");
  const [query, setQuery] = useState("");

  const searchLabel = t({
    en: "Search the design system",
    zh: "搜索设计系统",
  });
  const searchPlaceholder = t({ en: "Search", zh: "搜索" });
  const arrangementLabel = t({ en: "Arrangement", zh: "排列方式" });
  const byJobLabel = t({ en: "By job", zh: "按用途" });
  const byNameLabel = t({ en: "A–Z", zh: "按名称" });
  const oneResultLabel = t({ en: "1 result", zh: "1 个结果" });
  const manyResultsLabel = t({ en: "results", zh: "个结果" });
  // No "nothing found" heading: the result count above already says so, and an
  // empty state that repeats it spends its one line saying nothing new.
  const emptyHint = t({
    en: "Try another word — a name like “Switch”, or the job it does: “modal”, “dropdown”, “toggle”.",
    zh: "换个词试试——可以是名称（如“开关”），也可以是用途：“modal”“dropdown”“toggle”。",
  });
  const clearLabel = t({ en: "Clear search", zh: "清除搜索" });

  const matches = entries.filter((entry) =>
    matchesDesignSystemQuery(entry.path, entry.label, query),
  );
  const matchedByPath = new Map(matches.map((entry) => [entry.path, entry]));
  const inOrder = (paths: readonly DesignSystemPath[]) =>
    paths.flatMap((path) => {
      const entry = matchedByPath.get(path);
      return entry === undefined ? [] : [entry];
    });

  const visible = buildBlocks({
    arrangement,
    inOrder,
    groupLabels,
    alphabeticalOrder,
  }).filter(hasEntries);
  const resultCount =
    query === ""
      ? ""
      : matches.length === 1
        ? oneResultLabel
        : `${String(matches.length)} ${manyResultsLabel}`;

  return (
    <div css={styles.browser}>
      <div css={styles.controls}>
        <div css={styles.toolbar}>
          <div css={styles.search}>
            <TextField
              type="search"
              label={searchLabel}
              labelHidden
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              leading={<MagnifyingGlassIcon weight="bold" />}
              css={styles.searchInput}
            />
            {query !== "" && (
              <IconButton
                size="sm"
                icon={<XIcon weight="bold" />}
                aria-label={clearLabel}
                css={styles.clear}
                onClick={() => {
                  setQuery("");
                }}
              />
            )}
          </div>
          <SegmentedControl
            aria-label={arrangementLabel}
            value={arrangement}
            onChange={setArrangement}
            options={[
              { value: "job", label: byJobLabel },
              { value: "name", label: byNameLabel },
            ]}
          />
        </div>
        {/* Always mounted and holding its line, empty until there is a query: a
            live region that only appears once results change has nothing to
            announce from, and one that appears at all shifts the page. */}
        <p role="status" css={styles.resultCount}>
          {resultCount}
        </p>
      </div>

      {visible.length === 0 ? (
        <p css={styles.emptyHint}>{emptyHint}</p>
      ) : (
        visible.map((block) => (
          <section key={block.key} css={styles.section}>
            {block.heading !== null && (
              <h2 css={styles.sectionTitle}>{block.heading}</h2>
            )}
            {block.entries.length > 0 && <Grid entries={block.entries} />}
            {block.children
              .filter((child) => child.entries.length > 0)
              .map((child) => (
                <div key={child.key} css={styles.category}>
                  <h3 css={styles.categoryTitle}>{child.heading}</h3>
                  <Grid entries={child.entries} />
                </div>
              ))}
          </section>
        ))
      )}
    </div>
  );
}

function Grid({ entries }: { entries: OverviewEntry[] }) {
  return (
    <div css={styles.grid}>
      {entries.map((entry) => (
        <Fragment key={entry.path}>{entry.tile}</Fragment>
      ))}
    </div>
  );
}

const styles = stylex.create({
  browser: {
    display: "flex",
    flexDirection: "column",
    gap: space._8,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._3,
  },
  // Takes the row's slack up to a comfortable reading width, then stops: a
  // search field as wide as the page reads as a form, not as a filter.
  search: {
    position: "relative",
    flexGrow: 1,
    flexBasis: "14rem",
    minInlineSize: 0,
    maxInlineSize: "24rem",
  },
  searchInput: {
    inlineSize: "100%",
    // Holds the trailing gutter whether or not the clear button is showing, so
    // typing the first character never reflows the text under the cursor.
    paddingInlineEnd: `calc(${controlSize._4} + ${controlSize._7})`,
    // The UA's own clear affordance is a fixed blue glyph that tracks neither
    // the palette nor the theme, and only two of the three engines draw one.
    "::-webkit-search-cancel-button": { display: "none" },
  },
  // Centred over the field's trailing gutter. The sr-only label is out of flow,
  // so the wrapper's box is exactly the input's and `auto` margins can centre
  // against it.
  clear: {
    position: "absolute",
    insetBlockStart: 0,
    insetBlockEnd: 0,
    insetInlineEnd: controlSize._2,
    marginBlock: "auto",
  },
  resultCount: {
    margin: 0,
    minBlockSize: "1lh",
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  sectionTitle: {
    margin: 0,
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
  },
  category: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  // A rank below the section title and read as one: uppercase and tracked out,
  // the same move the rail makes to separate its two levels.
  categoryTitle: {
    margin: 0,
    fontSize: font.uiCaption,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
    color: color.textSubtle,
  },
  // `auto-fill`, not `auto-fit`: the groups run from two tiles to eight, and
  // `auto-fit` collapses the empty tracks so a two-tile group would stretch into
  // two half-page slabs while an eight-tile group keeps normal cards. Holding the
  // empty tracks keeps one tile width down the whole page, so group size reads as
  // group size rather than as importance.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: space._3,
  },
  emptyHint: {
    margin: 0,
    fontSize: font.uiHeading3,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    maxInlineSize: "52ch",
    textWrap: "pretty",
  },
});
