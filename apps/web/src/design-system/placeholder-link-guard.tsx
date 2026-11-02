"use client";

import type { MouseEvent, ReactNode } from "react";

interface PlaceholderLinkGuardProps {
  children: ReactNode;
}

/**
 * Holds the click on a placeholder link (`href="#"`) in a live preview, so the
 * page does not jump to the top and the URL gains no `#`. It runs in the
 * capture phase and only cancels the default action: the control's own
 * `onClick` still runs, and a link with a real destination still navigates.
 * It wraps the page content in the layout, so a new specimen needs nothing.
 */
export function PlaceholderLinkGuard({ children }: PlaceholderLinkGuardProps) {
  const holdPlaceholderClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (link?.getAttribute("href") === "#") event.preventDefault();
  };

  return (
    <div style={{ display: "contents" }} onClickCapture={holdPlaceholderClick}>
      {children}
    </div>
  );
}
