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
    <div className="tk-scrim tk-scrim--centre" onPointerDown={onClose}>
      <div
        className="tk-dialog"
        role="dialog"
        aria-label="Export"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="tk-popover-head">
          <span className="tk-popover-title">Copy the export</span>
          <button type="button" className="tk-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="tk-dialog-note">
          The clipboard is not available here. Copy the text below.
        </p>
        <textarea
          className="tk-dialog-text"
          ref={areaRef}
          readOnly
          value={text}
        />
      </div>
    </div>,
    document.body,
  );
}
