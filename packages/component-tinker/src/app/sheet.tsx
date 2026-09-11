import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type SheetMode = "peek" | "expanded";

export interface SheetTab {
  id: string;
  label: string;
}

interface SheetProps {
  tabs: SheetTab[];
  tab: string;
  onTab: (tab: string) => void;
  mode: SheetMode;
  onMode: (mode: SheetMode) => void;
  children: ReactNode;
}

/**
 * The phone's inspector and layer tree, one sheet with a tab each. It rests at
 * a peek and drags or taps up to nearly full height. The handle changes the
 * size only, and the tabs change the panel only.
 */
export function Sheet({
  tabs,
  tab,
  onTab,
  mode,
  onMode,
  children,
}: SheetProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const startRef = useRef(0);

  const label = tabs.find((option) => option.id === tab)?.label ?? "";

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = event.clientY;
    setDrag(0);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag === null) return;
    setDrag(event.clientY - startRef.current);
  };

  const onPointerUp = () => {
    if (drag === null) return;
    const moved = Math.abs(drag) > 12;
    if (moved) onMode(drag < 0 ? "expanded" : "peek");
    else onMode(mode === "peek" ? "expanded" : "peek");
    setDrag(null);
  };

  return (
    <section
      className={`tk-sheet tk-sheet--${mode}`}
      style={drag === null ? undefined : { translate: `0 ${String(drag)}px` }}
      aria-label={label}
    >
      <header
        className="tk-sheet-grip"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          className="tk-sheet-handle"
          aria-expanded={mode === "expanded"}
          onClick={() => {
            onMode(mode === "peek" ? "expanded" : "peek");
          }}
        >
          <span className="tk-sheet-bar" />
          <span className="tk-sr-only">
            {mode === "peek" ? `Expand ${label}` : `Collapse ${label}`}
          </span>
        </button>
        <div
          className="tk-segmented tk-sheet-tabs"
          role="tablist"
          aria-label="Panel"
        >
          {tabs.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              className="tk-segment"
              aria-selected={option.id === tab}
              // The grip drags the sheet, so a tab press must not reach it.
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={() => {
                onTab(option.id);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <div className="tk-sheet-body">{children}</div>
    </section>
  );
}
