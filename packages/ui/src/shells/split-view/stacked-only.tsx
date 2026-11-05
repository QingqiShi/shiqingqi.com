"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { splitViewDisplay } from "../navigation-split-view-layout.stylex.ts";

/**
 * Shows its children only where the content fills the view and covers the
 * sidebar, as on a phone. CSS decides, so the first paint is right, also from
 * the server. Outside a `NavigationSplitView`, it shows nothing.
 *
 * @internal
 */
export function StackedOnly({ children }: { children: ReactNode }) {
  return <div css={styles.stackedOnly}>{children}</div>;
}

/**
 * Shows its children only where the content does not fill the view, so
 * that a column shows beside it. It is the opposite of `StackedOnly`. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 *
 * @internal
 */
export function UnlessStacked({ children }: { children: ReactNode }) {
  return <div css={styles.unlessStacked}>{children}</div>;
}

/**
 * Shows its children only where the view does not show the full sidebar:
 * where the collapsed sidebar shows, or no sidebar. Use it for what the
 * full sidebar shows otherwise, such as the title of the screen. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 *
 * @internal
 */
export function UnlessFullSidebar({ children }: { children: ReactNode }) {
  return <div css={styles.unlessFullSidebar}>{children}</div>;
}

const styles = stylex.create({
  stackedOnly: {
    display: splitViewDisplay.stacked,
  },
  unlessStacked: {
    display: splitViewDisplay.unstacked,
  },
  unlessFullSidebar: {
    display: splitViewDisplay.noFullSidebar,
  },
});
