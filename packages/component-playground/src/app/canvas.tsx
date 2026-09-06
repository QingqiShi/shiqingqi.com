import type {
  ChangeStore,
  PlaygroundConfig,
  RenderedCell,
  TokenIndex,
} from "@tuja/component-playground";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  buildBlurLayers,
  buildEdgeBlurLayers,
} from "./model/build-blur-layers.ts";
import {
  effectsStylesheet,
  layerEffectsByLayer,
  type LayerEffects,
} from "./model/layer-effects.ts";

export interface Pick {
  cell: number;
  id: string;
}

const BAND_DEPTH = 24;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface BlurPlane {
  layer: string;
  radius: number;
  box: Box;
}

interface Band {
  key: string;
  edge: "block-start" | "block-end" | "inline-start" | "inline-end";
  radius: number;
  box: Box;
}

interface CellMeasurements {
  selection: Box | null;
  hover: Box | null;
  planes: BlurPlane[];
  bands: Band[];
  /** The blur plane covers the whole cell body, so it needs its size. */
  body: { width: number; height: number };
}

const EMPTY: CellMeasurements = {
  selection: null,
  hover: null,
  planes: [],
  bands: [],
  body: { width: 0, height: 0 },
};

function boxOf(element: Element, origin: DOMRect, zoom: number): Box {
  const rect = element.getBoundingClientRect();
  return {
    left: (rect.left - origin.left) / zoom,
    top: (rect.top - origin.top) / zoom,
    width: rect.width / zoom,
    height: rect.height / zoom,
  };
}

function union(boxes: Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));
  return { left, top, width: right - left, height: bottom - top };
}

const BAND_DIRECTION: Record<Band["edge"], string> = {
  "block-start": "to bottom",
  "block-end": "to top",
  "inline-start": "to right",
  "inline-end": "to left",
};

function bandBox(box: Box, edge: Band["edge"]): Box {
  if (edge === "block-start") return { ...box, height: BAND_DEPTH };
  if (edge === "block-end") {
    return {
      ...box,
      top: box.top + box.height - BAND_DEPTH,
      height: BAND_DEPTH,
    };
  }
  if (edge === "inline-start") return { ...box, width: BAND_DEPTH };
  return { ...box, left: box.left + box.width - BAND_DEPTH, width: BAND_DEPTH };
}

function boxStyle(box: Box) {
  return {
    left: `${String(box.left)}px`,
    top: `${String(box.top)}px`,
    width: `${String(box.width)}px`,
    height: `${String(box.height)}px`,
  };
}

interface CellProps {
  cell: RenderedCell;
  config: PlaygroundConfig;
  store: ChangeStore;
  index: TokenIndex;
  effects: Record<string, LayerEffects>;
  scheme: "light" | "dark";
  width: number | null;
  zoom: number;
  renderKey: string;
  selection: Pick | null;
  hover: Pick | null;
  onSelect: (pick: Pick) => void;
  onHover: (pick: Pick | null) => void;
}

function Cell({
  cell,
  config,
  store,
  index,
  effects,
  scheme,
  width,
  zoom,
  renderKey,
  selection,
  hover,
  onSelect,
  onHover,
}: CellProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [measured, setMeasured] = useState<CellMeasurements>(EMPTY);

  const effectKey = Object.keys(config.layers)
    .map(
      (layer) =>
        `${layer}:${store.toggle(layer, "floating")}:${store.toggle(layer, "scrollMask")}`,
    )
    .join("|");
  const selectedId = selection?.cell === cell.index ? selection.id : null;
  const hoveredId =
    hover?.cell === cell.index && hover.id !== selectedId ? hover.id : null;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const bump = () => {
      setTick((current) => current + 1);
    };
    const observer = new ResizeObserver(bump);
    observer.observe(body);
    body.addEventListener("scroll", bump, { capture: true, passive: true });
    window.addEventListener("resize", bump);
    return () => {
      observer.disconnect();
      body.removeEventListener("scroll", bump, { capture: true });
      window.removeEventListener("resize", bump);
    };
  }, []);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      setMeasured(EMPTY);
      return;
    }
    const origin = body.getBoundingClientRect();
    const find = (id: string) =>
      body.querySelector<HTMLElement>(`[data-playground-id="${id}"]`);
    const instances = (layer: string) => [
      ...body.querySelectorAll<HTMLElement>(`[data-layer="${layer}"]`),
    ];

    const selected = selectedId ? find(selectedId) : null;
    const hovered = hoveredId ? find(hoveredId) : null;

    const layers = Object.keys(config.layers);
    const runEffects = layerEffectsByLayer(store, layers);
    const planes: BlurPlane[] = [];
    for (const layer of layers.filter((name) => runEffects[name].floating)) {
      const found = instances(layer);
      if (found.length === 0) continue;
      const radius = runEffects[layer].floating?.radius ?? 0;
      planes.push({
        layer,
        radius,
        box: union(found.map((element) => boxOf(element, origin, zoom))),
      });
    }

    const bands: Band[] = [];
    for (const layer of layers.filter((name) => runEffects[name].scrollMask)) {
      const mask = runEffects[layer].scrollMask;
      if (!mask) continue;
      const isHorizontal = mask.orientation === "horizontal";
      instances(layer).forEach((element, position) => {
        const box = boxOf(element, origin, zoom);
        const start = isHorizontal ? element.scrollLeft : element.scrollTop;
        const size = isHorizontal ? element.clientWidth : element.clientHeight;
        const total = isHorizontal ? element.scrollWidth : element.scrollHeight;
        const startEdge: Band["edge"] = isHorizontal
          ? "inline-start"
          : "block-start";
        const endEdge: Band["edge"] = isHorizontal ? "inline-end" : "block-end";
        if (start > 1) {
          bands.push({
            key: `${layer}${String(position)}s`,
            edge: startEdge,
            radius: mask.radius,
            box: bandBox(box, startEdge),
          });
        }
        if (start + size < total - 1) {
          bands.push({
            key: `${layer}${String(position)}e`,
            edge: endEdge,
            radius: mask.radius,
            box: bandBox(box, endEdge),
          });
        }
      });
    }

    setMeasured({
      selection: selected ? boxOf(selected, origin, zoom) : null,
      hover: hovered ? boxOf(hovered, origin, zoom) : null,
      planes,
      bands,
      body: { width: body.clientWidth, height: body.clientHeight },
    });
  }, [
    selectedId,
    hoveredId,
    renderKey,
    zoom,
    scheme,
    width,
    tick,
    effectKey,
    store,
    config,
  ]);

  const idAt = (target: EventTarget | null) =>
    target instanceof Element
      ? (target
          .closest("[data-playground-id]")
          ?.getAttribute("data-playground-id") ?? null)
      : null;

  const selectedNode = selectedId ? cell.byId[selectedId] : undefined;
  const bodySize = measured.body;
  const hasFloating = Object.values(effects).some((layer) => layer.floating);

  return (
    <figure className={width ? "pg-cell" : "pg-cell pg-cell--full"}>
      <figcaption className="pg-cell-title">{cell.title}</figcaption>
      <div
        className="pg-cell-frame"
        style={{
          colorScheme: scheme,
          backgroundColor: index.ref("color.bgCanvas"),
          color: index.ref("color.textMain"),
          fontFamily: index.ref("font.family"),
        }}
      >
        <div
          className={
            hasFloating ? "pg-cell-body pg-cell-body--floating" : "pg-cell-body"
          }
          ref={bodyRef}
          style={width ? { inlineSize: `${String(width)}px` } : undefined}
          onPointerMove={(event) => {
            const id = idAt(event.target);
            if (id !== (hover?.cell === cell.index ? hover.id : null)) {
              onHover(id ? { cell: cell.index, id } : null);
            }
          }}
          onPointerLeave={() => {
            onHover(null);
          }}
          onClick={(event) => {
            const id = idAt(event.target);
            if (id) onSelect({ cell: cell.index, id });
          }}
        >
          {hasFloating ? (
            <p className="pg-sample" aria-hidden>
              A floating element blurs the page around it instead of darkening
              it. This paragraph is the page: the blur is strongest against the
              element and eases back to sharp further out, so the element keeps
              a crisp edge and nothing goes dark.
            </p>
          ) : null}

          {cell.element}

          {measured.planes.map((plane) => (
            <div
              key={plane.layer}
              className="pg-blur-plane"
              aria-hidden
              style={boxStyle({
                left: 0,
                top: 0,
                width: bodySize.width,
                height: bodySize.height,
              })}
            >
              {buildBlurLayers({
                geometry: {
                  width: bodySize.width,
                  height: bodySize.height,
                  left: plane.box.left,
                  top: plane.box.top,
                  right: plane.box.left + plane.box.width,
                  bottom: plane.box.top + plane.box.height,
                },
                radius: plane.radius,
                isShown: true,
              }).map((step, position) => (
                <span
                  key={position}
                  style={{
                    backdropFilter: step.filter,
                    WebkitBackdropFilter: step.filter,
                    maskImage: step.mask,
                    WebkitMaskImage: step.mask,
                  }}
                />
              ))}
            </div>
          ))}

          {measured.bands.map((band) => (
            <div
              key={band.key}
              className="pg-band"
              aria-hidden
              style={boxStyle(band.box)}
            >
              {buildEdgeBlurLayers({
                direction: BAND_DIRECTION[band.edge],
                radius: band.radius,
                isShown: true,
              }).map((step, position) => (
                <span
                  key={position}
                  style={{
                    backdropFilter: step.filter,
                    WebkitBackdropFilter: step.filter,
                    maskImage: step.mask,
                    WebkitMaskImage: step.mask,
                  }}
                />
              ))}
            </div>
          ))}

          {measured.hover ? (
            <div
              className="pg-outline pg-outline--hover"
              aria-hidden
              style={boxStyle(measured.hover)}
            />
          ) : null}
          {measured.selection ? (
            <div
              className="pg-outline pg-outline--on"
              aria-hidden
              style={boxStyle(measured.selection)}
            >
              <span className="pg-outline-tag" style={{ zoom: 1 / zoom }}>
                {selectedNode?.layer}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </figure>
  );
}

interface CanvasProps {
  cells: RenderedCell[];
  config: PlaygroundConfig;
  store: ChangeStore;
  index: TokenIndex;
  scheme: "light" | "dark";
  width: number | null;
  zoom: number;
  onZoom: (zoom: number) => void;
  renderKey: string;
  selection: Pick | null;
  onSelect: (pick: Pick) => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

/** Pinch on the cells, and the canvas scrolls. Nothing pans freely. */
function usePinch(
  target: RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoom: (zoom: number) => void,
) {
  const stateRef = useRef({ distance: 0, zoom: 1 });
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const spread = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      stateRef.current = { distance: spread(event.touches), zoom };
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || stateRef.current.distance === 0) return;
      event.preventDefault();
      const scale = spread(event.touches) / stateRef.current.distance;
      onZoom(
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stateRef.current.zoom * scale)),
      );
    };
    const onEnd = () => {
      stateRef.current.distance = 0;
    };
    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    return () => {
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
    };
  }, [target, zoom, onZoom]);
}

export function Canvas({
  cells,
  config,
  store,
  index,
  scheme,
  width,
  zoom,
  onZoom,
  renderKey,
  selection,
  onSelect,
}: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Pick | null>(null);
  usePinch(scrollRef, zoom, onZoom);

  // Every cell shares the same layers and store, so their effects are read
  // once here instead of once per cell.
  const effects = layerEffectsByLayer(store, Object.keys(config.layers));

  return (
    <div className="pg-canvas-scroll" ref={scrollRef}>
      <style>{effectsStylesheet(effects, index)}</style>
      <div className="pg-cells" style={{ zoom }}>
        {cells.map((cell) => (
          <Cell
            key={cell.index}
            cell={cell}
            config={config}
            store={store}
            index={index}
            effects={effects}
            scheme={scheme}
            width={width}
            zoom={zoom}
            renderKey={renderKey}
            selection={selection}
            hover={hover}
            onSelect={onSelect}
            onHover={setHover}
          />
        ))}
      </div>
    </div>
  );
}
