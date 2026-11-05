"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { SheetRecedeContext } from "../../surfaces/sheet-recede-context.ts";
import { Sheet } from "../../surfaces/sheet.tsx";
import { liftOrigin } from "../lift-origin.ts";
import type { NavigationSplitViewDetail } from "./types.ts";
import { SplitViewColumnContext } from "./use-split-view-column.ts";

/** @internal */
export function DetailSheet({
  detail,
  view,
  pressedRef,
  onTakeOff,
}: {
  detail: NavigationSplitViewDetail | null;
  view: HTMLElement | null;
  pressedRef: RefObject<HTMLElement | null>;
  onTakeOff: (href: string) => void;
}) {
  const isOpen = detail !== null;
  const [lastSheet, setLastSheet] = useState<NavigationSplitViewDetail | null>(
    null,
  );
  if (isOpen && (lastSheet === null || lastSheet.key !== detail.key)) {
    setLastSheet(detail);
  }
  const sheet = isOpen ? detail : lastSheet;
  // A sheet can close after the URL changes, for example on Back. Then it
  // goes back into the link to the URL that it showed.
  const sheetHrefRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (isOpen) sheetHrefRef.current = window.location.href;
  });
  return (
    <SheetRecedeContext value={view}>
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          if (sheet !== null) onTakeOff(sheet.back.href);
        }}
        closeLabel={sheet?.closeLabel ?? ""}
        aria-label={sheet?.label ?? ""}
        liftFrom={() => {
          const pressed = pressedRef.current;
          pressedRef.current = null;
          const href = isOpen ? window.location.href : sheetHrefRef.current;
          return view === null ? null : liftOrigin(view, pressed, href);
        }}
      >
        {sheet === null ? null : (
          <SplitViewColumnContext
            value={{
              column: "detail",
              presentation: "sheet",
              scroller: null,
              isShown: true,
              close: () => {
                onTakeOff(sheet.back.href);
              },
            }}
          >
            {sheet.node}
          </SplitViewColumnContext>
        )}
      </Sheet>
    </SheetRecedeContext>
  );
}
