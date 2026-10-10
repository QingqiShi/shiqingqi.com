"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  font,
  layer,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import { tabBarTokens } from "./tab-bar.stylex.ts";
import { useFinanceDestinations } from "./use-finance-destinations.ts";
import { useFreshPrefetch } from "./use-fresh-prefetch.ts";

/**
 * The five Finance destinations as a bar at the bottom of the screen, below
 * `md`, where one tap switches screens. A dot on Transactions says that
 * changes wait to sync.
 */
export function FinanceTabBar() {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const destinations = useFinanceDestinations();
  const prefetch = useFreshPrefetch();
  const status = useSyncStatus();
  const waiting = status.pendingCount > 0;

  return (
    <nav aria-label={t({ en: "Finance", zh: "家庭账本" })} css={styles.bar}>
      <ul css={styles.list}>
        {destinations.map((destination) => {
          const isCurrent = isCurrentDestination(current, destination.path);
          return (
            <li key={destination.path} css={styles.item}>
              <Link
                href={getLocalePath(destination.path, locale)}
                prefetch={prefetch}
                aria-current={isCurrent ? "page" : undefined}
                {...stylex.props(
                  typeRole.caption,
                  transition.colors,
                  corner.radius_3,
                  styles.link,
                  a11y.focusRingInset,
                )}
              >
                <span css={styles.icon}>
                  <destination.icon
                    weight={isCurrent ? "fill" : "bold"}
                    role="presentation"
                  />
                  {waiting && destination.path === "/finance/transactions" ? (
                    <span css={[corner.radius_round, styles.dot]} />
                  ) : null}
                </span>
                <span css={styles.label}>{destination.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const styles = stylex.create({
  // A bar at the bottom never covers the top-centre point that iOS Safari
  // samples for the status bar colour, so its full width is safe.
  bar: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    insetInline: 0,
    insetBlockEnd: 0,
    zIndex: layer.header,
    paddingBlockEnd: "env(safe-area-inset-bottom)",
    paddingInlineStart: `calc(${pageGutter.inlineStart} - ${space._3})`,
    paddingInlineEnd: `calc(${pageGutter.inlineEnd} - ${space._3})`,
    backgroundColor: color.bgSurface,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  list: {
    display: "flex",
    blockSize: tabBarTokens.blockSize,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    display: "flex",
    flexBasis: 0,
    flexGrow: 1,
    minInlineSize: 0,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    flexGrow: 1,
    minInlineSize: 0,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
      ":is([aria-current=page])": color.fg,
    },
    textDecoration: "none",
  },
  icon: {
    position: "relative",
    display: "inline-flex",
    fontSize: controlSize._5,
  },
  dot: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: `calc(-1 * ${space._0})`,
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.fgWarning,
  },
  label: {
    maxInlineSize: "100%",
    letterSpacing: font.trackingTight,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});
