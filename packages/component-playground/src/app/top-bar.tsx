import { Segmented, type SegmentedOption } from "./segmented.tsx";

interface TopBarProps {
  component: string;
  source: string;
  scheme: "light" | "dark";
  onScheme: (scheme: "light" | "dark") => void;
  width: number | null;
  onWidth: (width: number | null) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  onReset: () => void;
  onExport: () => void;
  flash: string | null;
  isPhone: boolean;
}

const THEMES: SegmentedOption<"light" | "dark">[] = [
  { value: "light", label: "light" },
  { value: "dark", label: "dark" },
];

const WIDTHS: SegmentedOption<number | null>[] = [
  320,
  375,
  768,
  1080,
  null,
].map((width) => ({
  value: width,
  label: width === null ? "full" : String(width),
}));

const ZOOMS: SegmentedOption<number>[] = [1, 1.5, 2].map((zoom) => ({
  value: zoom,
  label: `${String(zoom)}x`,
}));

export function TopBar({
  component,
  source,
  scheme,
  onScheme,
  width,
  onWidth,
  zoom,
  onZoom,
  onReset,
  onExport,
  flash,
  isPhone,
}: TopBarProps) {
  return (
    <header className="pg-bar">
      <div className="pg-bar-name">
        <span className="pg-component">{component}</span>
        <span className="pg-source">{source}</span>
      </div>

      <div className="pg-bar-controls">
        <Segmented
          label="Theme"
          options={THEMES}
          value={scheme}
          onPick={onScheme}
        />

        {isPhone ? null : (
          <>
            <Segmented
              label="Container width"
              options={WIDTHS}
              value={width}
              onPick={onWidth}
            />
            <Segmented
              label="Zoom"
              options={ZOOMS}
              value={zoom}
              onPick={onZoom}
              isPressed={(option) => Math.abs(zoom - option) < 0.01}
            />
            <button type="button" className="pg-button" onClick={onReset}>
              Reset all
            </button>
          </>
        )}

        <button
          type="button"
          className="pg-button pg-button--go"
          onClick={onExport}
        >
          {flash ?? "Export"}
        </button>
      </div>
    </header>
  );
}
