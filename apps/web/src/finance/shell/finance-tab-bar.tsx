"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  color,
  controlSize,
  font,
  layer,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import { tabBarTokens } from "./tab-bar.stylex.ts";
import { useFinanceDestinations } from "./use-finance-destinations.ts";
import { useFreshPrefetch } from "./use-fresh-prefetch.ts";
import { useSyncStatusSummary } from "./use-sync-status-summary.tsx";

/**
 * The five Finance destinations in a pill that floats above the bottom of the
 * screen, below `md`, where one tap switches screens. A dot on Transactions
 * says that changes wait to sync. A dot on Settings, where the full sync
 * status is, says that sync has a problem, and the link's name says which.
 */
export function FinanceTabBar() {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const destinations = useFinanceDestinations();
  const prefetch = useFreshPrefetch();
  const { status, label, attention } = useSyncStatusSummary();
  const waiting = status.pendingCount > 0;

  return (
    <nav
      aria-label={t({ en: "Finance", zh: "家庭账本" })}
      css={[corner.radius_round, styles.bar]}
    >
      <ul css={[glassSurface.base, corner.radius_round, styles.list]}>
        {destinations.map((destination) => {
          const isCurrent = isCurrentDestination(current, destination.path);
          const isSettings = destination.path === "/finance/settings";
          return (
            <li key={destination.path} css={styles.item}>
              <Link
                href={getLocalePath(destination.path, locale)}
                prefetch={prefetch}
                aria-current={isCurrent ? "page" : undefined}
                {...stylex.props(
                  typeRole.caption,
                  a11y.touchTarget,
                  transition.colors,
                  corner.radius_round,
                  selected.quiet,
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
                  {isSettings && attention ? (
                    <span
                      css={[
                        corner.radius_round,
                        styles.dot,
                        attentionStyles[attention],
                      ]}
                    />
                  ) : null}
                </span>
                <span css={styles.label}>{destination.label}</span>{" "}
                {isSettings ? (
                  <span css={a11y.srOnly} role="status">
                    {attention ? label : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const styles = stylex.create({
  // The pill is nearly as wide as the screen, but it is at the bottom, so it
  // never covers the top-centre point that iOS Safari samples for the status
  // bar colour.
  bar: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    insetInlineStart: pageGutter.inlineStart,
    insetInlineEnd: pageGutter.inlineEnd,
    insetBlockEnd: tabBarTokens.insetBlockEnd,
    zIndex: layer.header,
    // The glass casts only a small shadow. A bar that floats over the content
    // needs a deeper one, so the frame casts it.
    boxShadow: shadow._4,
  },
  // Text and large amounts scroll behind the labels. A deeper blur and a fill
  // tinted with the surface colour keep the content from competing with them.
  list: {
    [glassTokens.blur]: "24px",
    [glassTokens.fill]: `color-mix(in srgb, ${color.bgSurface} 30%, ${color.bgMaterialGlass})`,
    position: "relative",
    display: "flex",
    blockSize: tabBarTokens.blockSize,
    margin: 0,
    padding: space._0,
    listStyle: "none",
  },
  // Each item starts at the width of its label and takes an equal share of
  // the remaining space, so that "Transactions" fits on a 375px screen.
  item: {
    display: "flex",
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
    paddingInline: space._0,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
      ":is([aria-current=page])": color.fg,
    },
    fontWeight: font.weight_5,
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

const attentionStyles = stylex.create({
  waiting: { backgroundColor: color.fgWarning },
  problem: { backgroundColor: color.fgDanger },
});
