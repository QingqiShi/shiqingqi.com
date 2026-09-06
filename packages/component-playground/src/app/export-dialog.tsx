import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./use-escape.ts";

interface ExportDialogProps {
  text: string;
  onClose: () => void;
}

/** The fallback when the clipboard refuses: the text, already selected. */
export function ExportDialog({ text, onClose }: ExportDialogProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEscape(true, onClose);
  useEffect(() => {
    areaRef.current?.focus();
    areaRef.current?.select();
  }, []);
  return createPortal(
    <div className="pg-scrim pg-scrim--centre" onPointerDown={onClose}>
      <div
        className="pg-dialog"
        role="dialog"
        aria-label="Export"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="pg-popover-head">
          <span className="pg-popover-title">Copy the export</span>
          <button type="button" className="pg-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="pg-dialog-note">
          The clipboard is not available here. Copy the text below.
        </p>
        <textarea
          className="pg-dialog-text"
          ref={areaRef}
          readOnly
          value={text}
        />
      </div>
    </div>,
    document.body,
  );
}
