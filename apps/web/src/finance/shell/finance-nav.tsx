"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import { useFinanceDestinations } from "./use-finance-destinations.ts";
import { useFreshPrefetch } from "./use-fresh-prefetch.ts";

/** The five Finance destinations in the rail at `md` and wider; below `md` the tab bar holds them. */
export function FinanceNav() {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const destinations = useFinanceDestinations();
  const prefetch = useFreshPrefetch();

  return (
    <nav aria-label={t({ en: "Finance", zh: "家庭账本" })}>
      <ul css={[stack.tight, styles.list]}>
        {destinations.map((destination) => (
          <li key={destination.path}>
            <Link
              href={getLocalePath(destination.path, locale)}
              prefetch={prefetch}
              aria-current={
                isCurrentDestination(current, destination.path)
                  ? "page"
                  : undefined
              }
              {...stylex.props(
                typeRole.label,
                transition.colors,
                corner.radius_round,
                styles.link,
                selected.quiet,
                a11y.focusRingInset,
              )}
            >
              <span css={styles.icon}>
                <destination.icon weight="bold" role="presentation" />
              </span>
              {destination.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._3,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
      ":is([aria-current=page])": color.fg,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  icon: {
    display: "inline-flex",
    fontSize: controlSize._4,
  },
});
