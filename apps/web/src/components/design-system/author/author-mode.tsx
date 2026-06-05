"use client";

import * as stylex from "@stylexjs/stylex";
import { border, color, font, layer, space } from "@tuja/ui/tokens.stylex";
import { type ReactNode, useState } from "react";
import { AuthorInspect } from "./author-inspect.tsx";
import { AuthorPanel } from "./author-panel.tsx";
import { AuthorProvider, useAuthor } from "./author-store.tsx";

/**
 * Dev-only entry point for design-system author mode. In production the
 * `NODE_ENV` guard returns the children untouched, so SWC/Turbopack drops the
 * whole author subtree (panel, engine, transport client) from the bundle —
 * same proven pattern as `react-grab.tsx`.
 */
export function AuthorMode({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") {
    return <>{children}</>;
  }
  return <AuthorModeInner>{children}</AuthorModeInner>;
}

function AuthorModeInner({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <AuthorProvider>
      {children}
      <AuthorChrome active={active} setActive={setActive} />
    </AuthorProvider>
  );
}

// Lives inside the provider so the toggle can read the selection (to step aside
// when the sidebar slides in) and clear it when author mode is switched off.
function AuthorChrome({
  active,
  setActive,
}: {
  active: boolean;
  setActive: (value: boolean) => void;
}) {
  const { selectedPath, clearSelection, resetAll } = useAuthor();
  const shifted = active && selectedPath !== null;

  return (
    <>
      {active ? (
        <>
          <AuthorPanel />
          <AuthorInspect />
        </>
      ) : null}
      <button
        type="button"
        css={[
          styles.toggle,
          active && styles.toggleActive,
          shifted && styles.toggleShifted,
        ]}
        aria-pressed={active}
        onClick={() => {
          const next = !active;
          setActive(next);
          // Leaving author mode drops any unapplied edits so their live-preview
          // overrides don't linger on the page (the provider stays mounted).
          if (!next) {
            clearSelection();
            resetAll();
          }
        }}
      >
        <PencilIcon />
        {active ? "Done" : "Author mode"}
      </button>
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

const styles = stylex.create({
  toggle: {
    position: "fixed",
    insetBlockEnd: space._3,
    insetInlineEnd: space._3,
    zIndex: layer.toaster,
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._3,
    border: "none",
    borderRadius: border.radius_round,
    backgroundColor: color.bgInverse,
    color: color.textOnInverse,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: "240ms",
    transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.3, 1)",
  },
  toggleActive: {
    backgroundColor: color.accent,
    color: color.accentOn,
  },
  toggleShifted: {
    transform: `translateX(calc(-1 * min(360px, 92vw)))`,
  },
});
