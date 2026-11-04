import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { getDesignSystemRouteNeighbours } from "#src/design-system/routes/get-design-system-route-neighbours.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { Pager } from "#src/links/pager.tsx";
import { breakoutBox, breakoutMarker } from "./reading-column.stylex.ts";

interface DocPagerProps {
  path: DesignSystemPath;
}

/**
 * The links to the routes before and after this one in the sidebar, the last
 * block of the documentation, so a reader can go through the system page by
 * page. It takes the column of the block above it: the reading column, or the
 * page when that block is a breakout. The Lab is a tool, not a page to read in
 * sequence, so it has none.
 */
export function DocPager({ path }: DocPagerProps) {
  const { previous, next } = getDesignSystemRouteNeighbours(path);
  const locale = getLocale();

  return (
    <Pager
      aria-label={t({ en: "Previous and next pages", zh: "上一页与下一页" })}
      css={styles.pager}
      previous={
        previous && {
          href: getLocalePath(previous, locale),
          label: t({ en: "Previous", zh: "上一页" }),
          title: getDesignSystemRouteLabel(previous),
        }
      }
      next={
        next && {
          href: getLocalePath(next, locale),
          label: t({ en: "Next", zh: "下一页" }),
          title: getDesignSystemRouteLabel(next),
        }
      }
    />
  );
}

// The block just before the pager, the second child from the end, is a breakout.
const styles = stylex.create({
  pager: {
    inlineSize: {
      default: null,
      [stylex.when.siblingBefore(":nth-last-child(2)", breakoutMarker)]:
        breakoutBox.inlineSize,
    },
    marginInlineStart: {
      default: null,
      [stylex.when.siblingBefore(":nth-last-child(2)", breakoutMarker)]:
        breakoutBox.marginInlineStart,
    },
  },
});
