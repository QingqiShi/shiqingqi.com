import {
  configHash,
  createChangeStore,
  createTokenIndex,
  renderCell,
  serialiseExport,
} from "@tuja/component-tinker";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import catalogueJson from "virtual:tinker-catalogue";
import configJson from "virtual:tinker-config";
import { Breadcrumb } from "./breadcrumb.tsx";
import { Canvas, type Pick } from "./canvas.tsx";
import { ExportDialog } from "./export-dialog.tsx";
import { Inspector } from "./inspector.tsx";
import { LayerTree } from "./layer-tree.tsx";
import { clearSnapshot } from "./model/clear-snapshot.ts";
import { effectStyle, layerEffects } from "./model/layer-effects.ts";
import { loadSnapshot } from "./model/load-snapshot.ts";
import { saveSnapshot } from "./model/save-snapshot.ts";
import { Sheet, type SheetTab } from "./sheet.tsx";
import { TopBar } from "./top-bar.tsx";
import { useEditedStore } from "./use-edited-store.ts";
import { useEscape } from "./use-escape.ts";
import { useFlash } from "./use-flash.ts";
import { useMediaQuery } from "./use-media-query.ts";
import "./chrome.css";

const catalogue = catalogueJson;
const config = configJson;
const index = createTokenIndex(catalogue);
const changeStore = createChangeStore(config);
const storageKey = `component-tinker:${configHash(config)}`;

loadSnapshot(storageKey, changeStore);

const SHEET_TABS: SheetTab[] = [
  { id: "inspector", label: "Inspector" },
  { id: "layers", label: "Layers" },
];

/** The page starts in the theme it is shown in, then follows the toggle. */
function chromeScheme(): "light" | "dark" {
  const stamped = document.documentElement.dataset.theme;
  if (stamped === "dark" || stamped === "light") return stamped;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const { store, version } = useEditedStore(changeStore);
  const isPhone = !useMediaQuery("(min-width: 768px)");
  const [scheme, setScheme] = useState(chromeScheme);
  // `null` is the full canvas width: the stand-in starts with no container
  // constraint, and the fixed widths are there to test one.
  const [width, setWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [sheetMode, setSheetMode] = useState<"peek" | "expanded">("peek");
  const [sheetTab, setSheetTab] = useState("inspector");
  const [dialogText, setDialogText] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveSnapshot(storageKey, store);
  }, [store]);

  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);

  useEscape(isPhone && sheetMode === "expanded", () => {
    setSheetMode("peek");
  });

  const cells = config.cells.map((cell, cellIndex) =>
    renderCell({
      cell,
      cellIndex,
      config,
      index,
      store,
      effectStyle: (layer) => effectStyle(layerEffects(store, layer), index),
    }),
  );

  const fallback = cells.at(0)?.tree.at(0);
  const selection: Pick | null =
    picked ?? (fallback ? { cell: 0, id: fallback.id } : null);
  const cell = cells[selection?.cell ?? 0];
  const node = selection ? (cell.byId[selection.id] ?? null) : null;
  const renderKey = `${String(version)}|${scheme}|${String(width)}|${String(zoom)}`;

  const selectCell = (cellIndex: number) => {
    const root = cells.at(cellIndex)?.tree.at(0);
    if (root) setPicked({ cell: cellIndex, id: root.id });
  };

  const exportChanges = () => {
    const text = serialiseExport(config, store);
    // An insecure context has no clipboard at all.
    if (!("clipboard" in navigator)) {
      setDialogText(text);
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setFlash("Copied");
      },
      () => {
        setDialogText(text);
      },
    );
  };

  const resetAll = () => {
    store.resetAll();
    clearSnapshot(storageKey);
  };

  const inspector = (
    <Inspector
      config={config}
      store={store}
      index={index}
      node={node}
      isPhone={isPhone}
      renderKey={renderKey}
      canvasRef={canvasRef}
    />
  );

  const tree = (
    <LayerTree
      cells={cells}
      cellIndex={selection?.cell ?? 0}
      selectedId={selection?.id ?? null}
      onSelectCell={selectCell}
      onSelect={(cellIndex, id) => {
        setPicked({ cell: cellIndex, id });
      }}
    />
  );

  return (
    <div className={isPhone ? "tk-app tk-app--phone" : "tk-app"}>
      <TopBar
        component={config.component}
        source={config.source}
        scheme={scheme}
        onScheme={setScheme}
        width={width}
        onWidth={setWidth}
        zoom={zoom}
        onZoom={setZoom}
        onReset={resetAll}
        onExport={exportChanges}
        flash={flash}
        isPhone={isPhone}
      />

      <div className="tk-body">
        {isPhone ? null : (
          <aside className="tk-panel tk-panel--tree">{tree}</aside>
        )}

        <main className="tk-main">
          <Breadcrumb
            cell={cell}
            selectedId={selection?.id ?? null}
            onSelect={(id) => {
              setPicked({ cell: cell.index, id });
            }}
          />
          <Canvas
            cells={cells}
            config={config}
            store={store}
            index={index}
            scheme={scheme}
            width={width}
            zoom={zoom}
            onZoom={setZoom}
            renderKey={renderKey}
            canvasRef={canvasRef}
            selection={selection}
            onSelect={setPicked}
          />
        </main>

        {isPhone ? null : (
          <aside className="tk-panel tk-panel--inspector">{inspector}</aside>
        )}
      </div>

      {isPhone ? (
        <Sheet
          tabs={SHEET_TABS}
          tab={sheetTab}
          onTab={setSheetTab}
          mode={sheetMode}
          onMode={setSheetMode}
        >
          {sheetTab === "layers" ? (
            tree
          ) : (
            <>
              {inspector}
              <div className="tk-sheet-actions">
                <button type="button" className="tk-button" onClick={resetAll}>
                  Reset all
                </button>
              </div>
            </>
          )}
        </Sheet>
      ) : null}

      {dialogText === null ? null : (
        <ExportDialog
          text={dialogText}
          onClose={() => {
            setDialogText(null);
          }}
        />
      )}
    </div>
  );
}

const container = document.getElementById("tinker-root");
if (container) createRoot(container).render(<App />);
