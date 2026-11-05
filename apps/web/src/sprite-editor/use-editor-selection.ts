import { useState, type RefObject } from "react";
import { cloneCell } from "#src/sprite-editor/pixel-ops/clone-cell.ts";
import { cropCell } from "#src/sprite-editor/pixel-ops/crop-cell.ts";
import { eraseRect } from "#src/sprite-editor/pixel-ops/erase-rect.ts";
import { flipCellH } from "#src/sprite-editor/pixel-ops/flip-cell-h.ts";
import { flipCellV } from "#src/sprite-editor/pixel-ops/flip-cell-v.ts";
import { pasteCellScaled } from "#src/sprite-editor/pixel-ops/paste-cell-scaled.ts";
import type { CellPixels, Selection } from "./types";

interface EditorSelectionOptions {
  presentRef: RefObject<CellPixels>;
  push: (next: CellPixels) => void;
}

export function useEditorSelection({
  presentRef,
  push,
}: EditorSelectionOptions) {
  const [selection, setSelection] = useState<Selection | null>(null);

  // Selection action helpers ------------------------------------------------

  /**
   * Commit a floating selection back into the cell at its current rect
   * (scaled if rect.w/h differ from the lifted pixels' natural size). For
   * marquee selections, this is a no-op. Either way, the selection is
   * cleared. Pushes a single history entry so the whole edit can be undone.
   */
  const commitSelection = () => {
    if (selection === null) return;
    if (selection.mode === "floating") {
      const next = cloneCell(selection.previewBase);
      pasteCellScaled(
        next,
        selection.pixels,
        selection.rect.x,
        selection.rect.y,
        selection.rect.w,
        selection.rect.h,
      );
      push(next);
    }
    setSelection(null);
  };

  const cancelSelection = () => {
    setSelection(null);
  };

  const eraseSelection = () => {
    if (selection === null) return;
    if (selection.mode === "floating") {
      // Already cleared in previewBase — just commit that.
      push(cloneCell(selection.previewBase));
    } else {
      const next = cloneCell(presentRef.current);
      eraseRect(next, selection.rect);
      push(next);
    }
    setSelection(null);
  };

  const flipSelection = (axis: "h" | "v") => {
    if (selection === null) return;
    if (selection.mode === "floating") {
      const next = cloneCell(selection.pixels);
      if (axis === "h") flipCellH(next);
      else flipCellV(next);
      setSelection({ ...selection, pixels: next });
      return;
    }
    // Marquee: lift, flip the lifted pixels, but keep them floating so the
    // user can still move/resize/erase.
    const cropped = cropCell(presentRef.current, selection.rect);
    if (axis === "h") flipCellH(cropped);
    else flipCellV(cropped);
    const previewBase = cloneCell(presentRef.current);
    eraseRect(previewBase, selection.rect);
    setSelection({
      mode: "floating",
      rect: selection.rect,
      pixels: cropped,
      previewBase,
    });
  };

  const copySelection = () => {
    if (selection === null) return;
    // "Copy" duplicates the contents at a +2,+2 offset and leaves the
    // duplicate floating. The original stays in place.
    const offset = 2;
    const sourceCell =
      selection.mode === "floating" ? selection.pixels : presentRef.current;
    const sourceRect =
      selection.mode === "floating"
        ? { x: 0, y: 0, w: selection.pixels.width, h: selection.pixels.height }
        : selection.rect;
    const cropped = cropCell(sourceCell, sourceRect);
    // The previewBase needs to reflect the original still being present,
    // because we're DUPLICATING, not moving.
    const previewBase =
      selection.mode === "floating"
        ? // Bake the original lifted pixels back into previewBase before
          // creating the duplicate, otherwise we'd lose the original on
          // commit.
          (() => {
            const baked = cloneCell(selection.previewBase);
            pasteCellScaled(
              baked,
              selection.pixels,
              selection.rect.x,
              selection.rect.y,
              selection.rect.w,
              selection.rect.h,
            );
            return baked;
          })()
        : cloneCell(presentRef.current);
    setSelection({
      mode: "floating",
      rect: {
        x: selection.rect.x + offset,
        y: selection.rect.y + offset,
        w: selection.rect.w,
        h: selection.rect.h,
      },
      pixels: cropped,
      previewBase,
    });
  };

  /** Lift the current marquee selection to floating state. No-op otherwise. */
  const liftIfMarquee = (sel: Selection): Selection => {
    if (sel.mode === "floating") return sel;
    const cropped = cropCell(presentRef.current, sel.rect);
    const previewBase = cloneCell(presentRef.current);
    eraseRect(previewBase, sel.rect);
    return {
      mode: "floating",
      rect: sel.rect,
      pixels: cropped,
      previewBase,
    };
  };

  return {
    selection,
    setSelection,
    commitSelection,
    cancelSelection,
    eraseSelection,
    flipSelection,
    copySelection,
    liftIfMarquee,
  };
}
