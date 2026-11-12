"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import * as stylex from "@stylexjs/stylex";
import { useSyncExternalStore } from "react";
import { buttonTokens } from "../actions/button.stylex.ts";
import { Button } from "../actions/button.tsx";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import type { StyleProp } from "../types.ts";
import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebar-collapsed-cookie.ts";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCookie() {
  return document.cookie.split("; ").includes(`${SIDEBAR_COLLAPSED_COOKIE}=1`);
}

/**
 * Whether the visitor collapsed the sidebar. On the server, and until the page
 * hydrates, it is `onServer`: pass the value of the cookie there where the
 * server can read it, and else the sidebar shows expanded until then.
 *
 * @internal
 */
export function useSidebarCollapsed(onServer = false) {
  return useSyncExternalStore(subscribe, readCookie, () => onServer);
}

interface SidebarToggleProps {
  /** Names the button for assistive technology. */
  label: string;
  /** Where the button shows. */
  css?: StyleProp;
}

/**
 * The button that collapses the sidebar and expands it again. It keeps the
 * choice in `SIDEBAR_COLLAPSED_COOKIE`, and each view on the page follows it.
 *
 * @internal
 */
export function SidebarToggle({ label, css }: SidebarToggleProps) {
  const isCollapsed = useSidebarCollapsed();
  return (
    <Button
      size="sm"
      look="ghost"
      css={[styles.toggle, css]}
      icon={<SidebarSimpleIcon weight="bold" />}
      aria-label={label}
      aria-expanded={!isCollapsed}
      onClick={() => {
        document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${isCollapsed ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
        for (const listener of listeners) listener();
      }}
    />
  );
}

// Muted at rest, also on touch, so that it does not compete with the title.
const styles = stylex.create({
  toggle: {
    flexShrink: 0,
    [buttonTokens.color]: {
      default: color.mutedForeground,
      ":hover": { default: null, [pointer.canHover]: color.foreground },
    },
  },
});
