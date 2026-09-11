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
    <div className="tk-scrim" onPointerDown={onClose}>
      <div
        className={isPhone ? "tk-popover tk-popover--sheet" : "tk-popover"}
        style={isPhone ? undefined : popoverPosition(anchor)}
        role="dialog"
        aria-label={title}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="tk-popover-head">
          <span className="tk-popover-title">{title}</span>
          <button type="button" className="tk-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
