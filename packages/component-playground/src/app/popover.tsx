import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./use-escape.ts";

const POPOVER_WIDTH = 288;
const EDGE_GAP = 8;

interface PopoverProps {
  anchor: DOMRect | null;
  title: string;
  isPhone: boolean;
  onClose: () => void;
  children: ReactNode;
}

function popoverPosition(anchor: DOMRect | null) {
  if (!anchor) return { left: EDGE_GAP, top: EDGE_GAP };
  const left = Math.min(
    Math.max(anchor.left, EDGE_GAP),
    Math.max(window.innerWidth - POPOVER_WIDTH - EDGE_GAP, EDGE_GAP),
  );
  const below = anchor.bottom + 6;
  const room = window.innerHeight - below;
  if (room < 220 && anchor.top > room) {
    return { left, bottom: window.innerHeight - anchor.top + 6 };
  }
  return { left, top: below };
}

/** A menu on a pointer device, a bottom sheet on a phone. */
export function Popover({
  anchor,
  title,
  isPhone,
  onClose,
  children,
}: PopoverProps) {
  useEscape(true, onClose);
  return createPortal(
    <div className="pg-scrim" onPointerDown={onClose}>
      <div
        className={isPhone ? "pg-popover pg-popover--sheet" : "pg-popover"}
        style={isPhone ? undefined : popoverPosition(anchor)}
        role="dialog"
        aria-label={title}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="pg-popover-head">
          <span className="pg-popover-title">{title}</span>
          <button type="button" className="pg-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
