"use client";

import * as stylex from "@stylexjs/stylex";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { splitViewTokens } from "@tuja/ui/components/navigation-split-view.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { DESIGN_SYSTEM_CONTENT_ID } from "#src/design-system/design-system-content-id.ts";
import { DESIGN_SYSTEM_CONTENTS_PATH } from "#src/design-system/design-system-contents-path.ts";
import { DocPageSkeleton } from "#src/design-system/doc-page-skeleton.tsx";

interface DesignSystemFrameProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  sidebarLabel: string;
  contentLabel: string;
  /** Names the button that collapses the sidebar and expands it again. */
  toggleLabel: string;
  children: ReactNode;
}

function RouteLink(props: ComponentProps<"a"> & { href: string }) {
  return <Link {...props} prefetchOnIntent />;
}

/**
 * The view around every design-system page. The docs and the Lab of a route are
 * one page: its header stays mounted while the view switches, and the switch's
 * indicator slides between the two.
 */
export function DesignSystemFrame({
  sidebar,
  header,
  footer,
  sidebarLabel,
  contentLabel,
  toggleLabel,
  children,
}: DesignSystemFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  // On a narrow screen, the list of pages is a page of its own at this URL,
  // and each other page opens over it.
  const listHref = getLocalePath(DESIGN_SYSTEM_CONTENTS_PATH, locale);
  const isList = normalizePath(pathname) === DESIGN_SYSTEM_CONTENTS_PATH;
  return (
    <NavigationSplitView
      linkComponent={RouteLink}
      linkStatus={LinkStatus}
      replace={(href) => {
        router.replace(href);
      }}
      css={[pageColumn.regular, styles.view]}
      skeleton={<DocPageSkeleton css={styles.page} />}
      sidebar={{
        href: listHref,
        label: sidebarLabel,
        toggleLabel,
        header,
        footer,
        node: sidebar,
      }}
      content={{
        label: contentLabel,
        key: isList ? "contents" : pathname.replace(/\/lab$/, ""),
        back: isList ? null : { href: listHref, label: sidebarLabel },
        node: (
          // The target of the skip link. `tabIndex={-1}` lets the fragment move
          // focus here, and the ring confirms that the jump landed.
          <div
            id={DESIGN_SYSTEM_CONTENT_ID}
            tabIndex={-1}
            css={[corner.radius_3, styles.page, a11y.focusRing]}
          >
            {children}
          </div>
        ),
      }}
    />
  );
}

const styles = stylex.create({
  // Wide enough for the labels of the nav, and it leaves the pages their width
  // where the sidebar first fits.
  view: {
    [splitViewTokens.sidebarInlineSize]: space._13,
  },
  page: {
    paddingBlockStart: { default: space._3, [breakpoints.md]: space._7 },
    paddingBlockEnd: { default: space._8, [breakpoints.md]: space._8 },
    // The fragment jump of the skip link scrolls this box's top to the screen's.
    // Below `md`, keep the gap at the top of the page, so that the breadcrumb
    // stays beside the menu button.
    scrollMarginBlockStart: {
      default: `calc(${space._4} + env(safe-area-inset-top))`,
      [breakpoints.md]: 0,
    },
  },
});
