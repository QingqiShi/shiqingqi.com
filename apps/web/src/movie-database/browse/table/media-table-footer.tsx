"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Spinner } from "@tuja/ui/components/spinner";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";

interface MediaTableFooterProps {
  query: string;
  visibleCount: number;
  loadedCount: number;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

export function MediaTableFooter({
  query,
  visibleCount,
  loadedCount,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: MediaTableFooterProps) {
  const locale = useLocale();
  const loadMoreLabel = t({ en: "Load more", zh: "加载更多" });
  const loadingLabel = t({ en: "Loading more titles", zh: "正在加载更多" });
  const shownLabel = t({ en: "Shown", zh: "显示" });
  const loadedLabel = t({ en: "Loaded", zh: "已加载" });
  const endLabel = t({ en: "Everything loaded", zh: "已全部加载" });
  const hintLabel = t({
    en: "Drag to select cells, ⌘/Ctrl+C to copy, double-click a row to open it.",
    zh: "拖拽选择单元格，⌘/Ctrl+C 复制，双击行可打开详情。",
  });
  const numberFormat = new Intl.NumberFormat(locale);

  return (
    <div css={styles.footer}>
      <p css={styles.counts}>
        {query && (
          <>
            <span css={[typeRole.overline, styles.countLabel]}>
              {shownLabel}
            </span>
            <span
              css={[typeRole.label, typeModifier.numeric, styles.countValue]}
            >
              {numberFormat.format(visibleCount)}
            </span>
          </>
        )}
        <span css={[typeRole.overline, styles.countLabel]}>{loadedLabel}</span>
        <span css={[typeRole.label, typeModifier.numeric, styles.countValue]}>
          {numberFormat.format(loadedCount)}
        </span>
      </p>
      <p css={[typeRole.caption, styles.hint]}>{hintLabel}</p>
      <div css={styles.footerActions}>
        {isFetchingNextPage && <Spinner size="sm" label={loadingLabel} />}
        {hasNextPage ? (
          <Button size="sm" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {loadMoreLabel}
          </Button>
        ) : (
          <span css={[typeRole.caption, styles.endNote]}>{endLabel}</span>
        )}
      </div>
    </div>
  );
}

const styles = stylex.create({
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    backgroundColor: color.bgSurfaceSunken,
  },
  counts: {
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.tight,
    margin: 0,
  },
  countLabel: {
    color: color.fgMuted,
  },
  countValue: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
  hint: {
    display: { default: "none", [breakpoints.lg]: "block" },
    margin: 0,
    color: color.fgMuted,
  },
  footerActions: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    marginInlineStart: "auto",
  },
  endNote: {
    color: color.fgMuted,
  },
});
