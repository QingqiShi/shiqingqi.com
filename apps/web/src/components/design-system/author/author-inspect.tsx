"use client";

import { findEditableToken } from "@tuja/ui/author/token-registry";
import { color } from "@tuja/ui/tokens.stylex";
import { useEffect, useEffectEvent } from "react";
import { useAuthor } from "./author-store.tsx";

// While author mode is on, the whole page becomes the editing surface: every
// editable `[data-author-token]` specimen rings on hover and on select. The
// affordance is pure CSS keyed off two data attributes this layer toggles —
// `data-author-hovered` (under the pointer) and `data-author-selected` (the
// token whose editor the sidebar shows) — drawn as an *inset* ring on the real
// specimen rather than a separate overlay. Inset (not an outset ring/lift/drop
// shadow) is deliberate: specimens sit inside containers that clip overflow for
// their gridline-via-gap hairlines and concentric corners (the backgrounds
// grid, RoleColumn), so an outward affordance gets sheared off at those edges.
// An inset ring lives inside the specimen's own box and never clips. Only
// mounted in author mode, so the listeners and injected styles exist only while
// editing.

const ATTR = "data-author-token";
const HOVERED = "data-author-hovered";
const SELECTED = "data-author-selected";

// Interpolates live token vars (`var(--…)`) into a raw stylesheet — the same
// trick the author panel uses for its ring. Mounted only while author mode is
// active, so these rules never touch the page otherwise.
const AUTHOR_CSS = `
[${ATTR}] {
  transition: box-shadow 180ms ease;
}
[${HOVERED}] {
  cursor: pointer;
  box-shadow: inset 0 0 0 2px ${color.accentBorder};
}
[${SELECTED}] {
  box-shadow: inset 0 0 0 2px ${color.accent};
}
`;

/** The nearest enclosing specimen for an editable token, or null. */
function editableSpecimen(target: EventTarget | null): Element | null {
  const el = target instanceof Element ? target.closest(`[${ATTR}]`) : null;
  const path = el?.getAttribute(ATTR);
  return path && findEditableToken(path) ? el : null;
}

export function AuthorInspect() {
  const { selectedPath, selectPath, clearSelection } = useAuthor();

  // Read latest context fns without re-binding the listeners on every provider
  // render (the provider re-renders on each token edit). Same pattern as
  // use-dialog-focus.ts.
  const onPick = useEffectEvent((path: string) => {
    selectPath(path);
  });
  const onEscape = useEffectEvent(() => {
    clearSelection();
  });

  // Hover + click handling. A single rAF throttles pointermove, and a capturing
  // click listener intercepts the specimen before its own handlers run.
  useEffect(() => {
    let frame = 0;
    let hovered: Element | null = null;

    const setHovered = (next: Element | null) => {
      if (next === hovered) return;
      hovered?.removeAttribute(HOVERED);
      next?.setAttribute(HOVERED, "");
      hovered = next;
    };

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setHovered(editableSpecimen(event.target));
      });
    };

    const onClick = (event: MouseEvent) => {
      const el = editableSpecimen(event.target);
      if (!el) return; // not an editable specimen — let the click pass.
      event.preventDefault();
      event.stopPropagation();
      const path = el.getAttribute(ATTR);
      if (path) onPick(path);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Let an open popover (e.g. the palette picker) consume Escape to close
      // itself first; only the next Escape clears the selection.
      if (document.querySelector("[popover]:popover-open")) return;
      onEscape();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      setHovered(null);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
    };
    // Listeners bind once; onPick/onEscape are stable effect events that read
    // the latest store values without re-subscribing.
  }, []);

  // Mirror the selected token onto the DOM so the persistent ring tracks it.
  // Specimen paths are unique, but mark every match defensively.
  useEffect(() => {
    if (!selectedPath) return;
    const matches = document.querySelectorAll(
      `[${ATTR}="${CSS.escape(selectedPath)}"]`,
    );
    matches.forEach((el) => {
      el.setAttribute(SELECTED, "");
    });
    return () => {
      matches.forEach((el) => {
        el.removeAttribute(SELECTED);
      });
    };
  }, [selectedPath]);

  return <style>{AUTHOR_CSS}</style>;
}
