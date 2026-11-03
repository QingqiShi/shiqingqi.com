"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { splitViewTokens } from "@tuja/ui/components/navigation-split-view.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { measure, space } from "@tuja/ui/tokens.stylex";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { DESIGN_SYSTEM_CONTENT_ID } from "#src/design-system/design-system-content-id.ts";
import { Link, LinkStatus } from "#src/links/link.tsx";

interface DesignSystemFrameProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  sidebarLabel: string;
  contentLabel: string;
  menuLabel: string;
  closeLabel: string;
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
  menuLabel,
  closeLabel,
  children,
}: DesignSystemFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <NavigationSplitView
      linkComponent={RouteLink}
      linkStatus={LinkStatus}
      replace={(href) => {
        router.replace(href);
      }}
      css={[pageColumn.regular, styles.view]}
      skeleton={
        <div aria-busy css={[styles.page, stack.group]}>
          <div css={stack.text}>
            <Skeleton width="10rem" height="1rem" />
            <Skeleton width="16rem" height="2.5rem" />
          </div>
          <div css={[stack.tight, styles.prose]}>
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="85%" height="1rem" />
          </div>
          <Skeleton width="100%" height="16rem" />
        </div>
      }
      sidebar={{
        stacked: "drawer",
        label: sidebarLabel,
        menuLabel,
        closeLabel,
        header,
        footer,
        node: sidebar,
      }}
      content={{
        label: contentLabel,
        key: pathname.replace(/\/lab$/, ""),
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
  prose: {
    maxInlineSize: measure.prose,
  },
});
