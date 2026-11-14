"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import * as stylex from "@stylexjs/stylex";
import { createContext, use, useState, useSyncExternalStore } from "react";
import { buttonTokens } from "../actions/button.stylex.ts";
import { Button } from "../actions/button.tsx";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { StuckContext } from "../surfaces/sticky-control-group.tsx";
import type { StyleProp } from "../types.ts";
import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebar-collapsed-cookie.ts";

interface SidebarCollapseStore {
  subscribe: (listener: () => void) => () => void;
  read: () => boolean;
  write: (isCollapsed: boolean) => void;
}

function createStore(
  read: () => boolean,
  save: (isCollapsed: boolean) => void,
): SidebarCollapseStore {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read,
    write(isCollapsed) {
      save(isCollapsed);
      for (const listener of listeners) listener();
    },
  };
}

const cookieStore = createStore(
  () => document.cookie.split("; ").includes(`${SIDEBAR_COLLAPSED_COOKIE}=1`),
  (isCollapsed) => {
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${isCollapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  },
);

function createMemoryStore(initial: boolean) {
  let value = initial;
  return createStore(
    () => value,
    (isCollapsed) => {
      value = isCollapsed;
    },
  );
}

/**
 * The store of the nearest view around that has a sidebar the visitor can
 * collapse, or null where there is none.
 *
 * @internal
 */
export const SidebarCollapseContext =
  createContext<SidebarCollapseStore | null>(null);

/**
 * Whether the visitor collapsed the sidebar of this view, and the `scope` to
 * give to `SidebarCollapseContext` around the view. The outermost view that
 * `ownsSidebar` keeps the choice in `SIDEBAR_COLLAPSED_COOKIE`. A view in
 * another such view, such as an example on a page, keeps its choice to itself
 * and starts at `onServer`.
 *
 * On the server, and until the page hydrates, `isCollapsed` is `onServer`:
 * pass the value of the cookie there where the server can read it, and else
 * the sidebar shows expanded until then.
 *
 * @internal
 */
export function useSidebarCollapse(ownsSidebar: boolean, onServer = false) {
  const outer = use(SidebarCollapseContext);
  const [memoryStore] = useState(() => createMemoryStore(onServer));
  const store = outer === null ? cookieStore : memoryStore;
  const isCollapsed = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => onServer,
  );
  return { isCollapsed, scope: ownsSidebar ? store : outer };
}

interface SidebarToggleProps {
  /** Names the button for assistive technology. */
  label: string;
  /** Where the button shows. */
  css?: StyleProp;
}

/**
 * The button that collapses the sidebar and expands it again. It works on the
 * sidebar of the nearest view around that gives a `SidebarCollapseContext`.
 * While it holds over content that scrolls under it, it has a surface of its
 * own.
 *
 * @internal
 */
export function SidebarToggle({ label, css }: SidebarToggleProps) {
  const store = use(SidebarCollapseContext) ?? cookieStore;
  const isCollapsed = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => false,
  );
  const floats = use(StuckContext);
  return (
    <Button
      size="sm"
      look={floats ? undefined : "ghost"}
      css={[styles.toggle, !floats && styles.quiet, css]}
      icon={<SidebarSimpleIcon weight="bold" />}
      aria-label={label}
      aria-expanded={!isCollapsed}
      onClick={() => {
        store.write(!isCollapsed);
      }}
    />
  );
}

const styles = stylex.create({
  toggle: {
    flexShrink: 0,
  },
  // Muted at rest, also on touch, so that it does not compete with the title.
  quiet: {
    [buttonTokens.color]: {
      default: color.mutedForeground,
      ":hover": { default: null, [pointer.canHover]: color.foreground },
    },
  },
});
