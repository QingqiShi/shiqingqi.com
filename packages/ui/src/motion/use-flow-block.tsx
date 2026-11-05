import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefCallback,
} from "react";
import { createFlowMover, type FlowMover } from "./create-flow-mover.ts";
import { px, writeStyles, type Styles } from "./px.ts";
import {
  addFlowBlock,
  type FlowBlock,
  type FlowStretch,
  type FlowSurface,
} from "./read-flow.ts";

const PATTERN_PROPERTIES = [
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "background-origin",
  "background-clip",
] as const;

const SKIN_PROPERTIES = [
  "background-color",
  ...PATTERN_PROPERTIES,
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "corner-top-left-shape",
  "corner-top-right-shape",
  "corner-bottom-left-shape",
  "corner-bottom-right-shape",
  "box-shadow",
  "backdrop-filter",
] as const;

const SURFACE_HOLD = {
  "background-color": "transparent",
  "background-image": "none",
  "border-color": "transparent",
  "box-shadow": "none",
  "backdrop-filter": "none",
  isolation: "isolate",
} as const;

const CORNERS = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
] as const;

const SHADOW_ROOM_PX = 100;

/** A surface that moves leaves the device pixels, and its parts can show a hairline. */
const SEAM_OVERLAP_PX = 1;

/** An edge past the surface must add nothing that the page can scroll to. */
const LOWER_CLIP = { "clip-path": "inset(0 -100vmax -100vmax -100vmax)" };

const isOpaque = (color: string) => !/\/|rgba\(/.test(color);

interface SkinPlan {
  readonly paint: Styles;
  readonly inlineSize: number;
  readonly line: number;
  readonly openHeight: number;
  readonly reach: number;
  readonly shadowRoom: number;
  readonly mover: FlowMover;
  readonly patternMover: FlowMover;
  readonly parts: Set<HTMLElement>;
  /** The skin gets each later plan in the task of that plan. */
  readonly attach: (draw: (plan: SkinPlan) => void) => () => void;
}

/**
 * A round corner of half the radius holds a squircle of that radius, within
 * 0.5 px, and `inset()` has no corner shape. The clip must not cut the skin.
 */
function clipCornersOf(paint: Styles) {
  const radii = CORNERS.map((corner) => {
    const radius = Number.parseFloat(paint[`border-${corner}-radius`]) || 0;
    const shape = paint[`corner-${corner}-shape`];
    return shape === "" || shape === "round" ? radius : radius / 2;
  });
  return radii.some((radius) => radius > 0) ? radii.map(px).join(" ") : null;
}

function createSurfaceHold(element: HTMLElement, clipsNothing: boolean) {
  const held = new Map<string, string>();
  const hold = (name: string, value: string) => {
    held.set(name, element.style.getPropertyValue(name));
    element.style.setProperty(name, value);
  };
  hold("transition", "none");
  const style = getComputedStyle(element);
  const paint: Record<string, string> = {};
  for (const name of SKIN_PROPERTIES) {
    paint[name] = style.getPropertyValue(name);
  }
  const isBlock = style.display === "block";
  for (const [name, value] of Object.entries(SURFACE_HOLD)) hold(name, value);
  // The clip of a surface with nothing to clip would take the overshoot away.
  if (clipsNothing) {
    hold("overflow", "visible");
    // The clip kept the margins of the children in the box.
    if (isBlock) hold("display", "flow-root");
  }
  return {
    paint,
    drop: () => {
      for (const [name, value] of held) {
        element.style.setProperty(name, value);
      }
    },
  };
}

function createSurface(
  block: Pick<FlowBlock, "element">,
  showSkin: (plan: SkinPlan | null) => void,
): FlowSurface {
  let clipAt: (bottom: string) => string = () => "none";
  // The clip goes with the edge. It replaces the clip that the hold takes off,
  // or it hides new content below the edge.
  const clipMover = createFlowMover(null, null, (_x, y) => ({
    "clip-path": clipAt(px(-y)),
  }));
  const patternMover = createFlowMover(null, clipMover);
  const mover = createFlowMover(null, patternMover);
  const parts = new Set<HTMLElement>();
  let box = { top: 0, inlineSize: 0, clipsNothing: false };
  let users = 0;
  let paint: Styles = {};
  let line = Number.POSITIVE_INFINITY;
  let dropHold = () => {};
  let drawSkin: ((plan: SkinPlan) => void) | null = null;
  const attach = (draw: (plan: SkinPlan) => void) => {
    drawSkin = draw;
    return () => {
      if (drawSkin === draw) drawSkin = null;
    };
  };

  return {
    mover,
    read() {
      const { element } = block;
      if (element === null) return;
      const { top, width } = element.getBoundingClientRect();
      box = {
        top,
        inlineSize: width,
        // The hold of a motion in progress hides the clip from this read.
        clipsNothing:
          users > 0
            ? box.clipsNothing
            : getComputedStyle(element).overflowY !== "visible" &&
              element.scrollHeight <= element.clientHeight + 1 &&
              element.scrollWidth <= element.clientWidth + 1,
      };
    },
    stretch({ share, openHeight, closedHeight, clipsBelow }: FlowStretch) {
      const { element } = block;
      if (element === null) return () => {};
      for (const part of parts) part.style.removeProperty("display");
      if (users === 0) {
        const hold = createSurfaceHold(element, box.clipsNothing);
        paint = hold.paint;
        dropHold = hold.drop;
        const corners = box.clipsNothing ? clipCornersOf(paint) : null;
        if (corners !== null) {
          clipAt = (bottom) => `inset(0 0 ${bottom} 0 round ${corners})`;
          clipMover.setElement(element);
        } else if (clipsBelow === true) {
          clipAt = (bottom) => `inset(-100vmax -100vmax ${bottom} -100vmax)`;
          clipMover.setElement(element);
        }
      }
      users++;
      line = Math.min(line, Math.round(box.top + closedHeight / 2) - box.top);
      const plan: SkinPlan = {
        paint,
        inlineSize: box.inlineSize,
        line,
        openHeight,
        reach: openHeight + Math.abs(openHeight - closedHeight),
        shadowRoom: paint["box-shadow"] === "none" ? 0 : SHADOW_ROOM_PX,
        mover,
        patternMover,
        parts,
        attach,
      };
      showSkin(plan);
      drawSkin?.(plan);
      const release = mover.add(share);
      return () => {
        release();
        users--;
        if (users > 0) return;
        // React removes the skin after this task, and the surface paints in it.
        for (const part of parts) part.style.setProperty("display", "none");
        clipMover.setElement(null);
        dropHold();
        line = Number.POSITIVE_INFINITY;
        showSkin(null);
      };
    },
  };
}

const overlapOf = (paint: Styles) =>
  isOpaque(paint["background-color"]) ? SEAM_OVERLAP_PX : 0;

const partStyles = (
  { inlineSize }: SkinPlan,
  partHeight: number,
  clip: Styles,
): Styles => ({
  position: "absolute",
  "pointer-events": "none",
  "z-index": "-1",
  margin: "0",
  width: px(inlineSize),
  height: px(partHeight),
  ...clip,
});

const hasPatternOf = (paint: Styles) => paint["background-image"] !== "none";

function fillStyles({ paint, reach }: SkinPlan, fillTop: number): Styles {
  const fill: Record<string, string> = { ...paint };
  if (hasPatternOf(paint)) {
    for (const name of PATTERN_PROPERTIES) fill[name] = "initial";
  }
  return {
    ...fill,
    "box-sizing": "border-box",
    position: "absolute",
    "pointer-events": "none",
    top: px(fillTop),
    left: "0",
    width: "100%",
    height: px(reach),
    ...(hasPatternOf(paint) && { overflow: "clip" }),
  };
}

function patternStyles(
  { paint, openHeight }: SkinPlan,
  patternTop: number,
): Styles {
  const pattern: Record<string, string> = {};
  for (const name of PATTERN_PROPERTIES) pattern[name] = paint[name];
  return {
    ...pattern,
    position: "absolute",
    top: px(patternTop),
    left: "0",
    width: "100%",
    height: px(
      openHeight -
        Number.parseFloat(paint["border-top-width"]) -
        Number.parseFloat(paint["border-bottom-width"]),
    ),
  };
}

interface SkinElements {
  readonly upper: HTMLElement;
  readonly lower: HTMLElement;
  readonly upperFill: HTMLElement;
  readonly lowerFill: HTMLElement;
  readonly upperPattern: HTMLElement | null;
  readonly lowerPattern: HTMLElement | null;
}

function drawSkinOn(
  plan: SkinPlan,
  {
    upper,
    lower,
    upperFill,
    lowerFill,
    upperPattern,
    lowerPattern,
  }: SkinElements,
) {
  const surface = upper.parentElement;
  if (surface === null) return;
  const { line, openHeight, reach, paint, parts, shadowRoom } = plan;
  writeStyles(
    upper,
    partStyles(plan, shadowRoom + line + overlapOf(paint), {
      "overflow-y": "clip",
    }),
  );
  writeStyles(lower, partStyles(plan, openHeight - line, LOWER_CLIP));
  writeStyles(upperFill, fillStyles(plan, shadowRoom));
  writeStyles(lowerFill, fillStyles(plan, openHeight - reach - line));
  if (upperPattern !== null) writeStyles(upperPattern, patternStyles(plan, 0));
  if (lowerPattern !== null) {
    writeStyles(lowerPattern, patternStyles(plan, reach - openHeight));
  }
  const from = surface.getBoundingClientRect();
  const at = upper.getBoundingClientRect();
  const place = (part: HTMLElement, top: number) => {
    part.style.setProperty("margin-left", px(from.left - at.left));
    part.style.setProperty("margin-top", px(from.top + top - at.top));
    parts.add(part);
  };
  place(upper, -shadowRoom);
  place(lower, line);
}

/**
 * Two copies of the surface: the upper one stays and the lower one moves. Each
 * shows only its side of one line, so the corners keep their shape at each height
 * and a surface that one can see through does not paint twice.
 *
 * Each part has no inset and takes its place from a margin. A `position` on the
 * surface would change the containing block of what the surface holds.
 */
function FlowSkin({ skin }: { skin: SkinPlan }) {
  const upperRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);
  const upperFillRef = useRef<HTMLDivElement>(null);
  const lowerFillRef = useRef<HTMLDivElement>(null);
  const upperPatternRef = useRef<HTMLDivElement>(null);
  const lowerPatternRef = useRef<HTMLDivElement>(null);
  const { mover, patternMover, paint } = skin;
  const hasPattern = hasPatternOf(paint);

  useLayoutEffect(() => {
    const upper = upperRef.current;
    const lower = lowerRef.current;
    const upperFill = upperFillRef.current;
    const lowerFill = lowerFillRef.current;
    if (!upper || !lower || !upperFill || !lowerFill) return;
    const elements = {
      upper,
      lower,
      upperFill,
      lowerFill,
      upperPattern: upperPatternRef.current,
      lowerPattern: lowerPatternRef.current,
    };
    drawSkinOn(skin, elements);
    const detach = skin.attach((plan) => {
      drawSkinOn(plan, elements);
    });
    return () => {
      detach();
      skin.parts.delete(upper);
      skin.parts.delete(lower);
    };
  }, [skin]);

  useLayoutEffect(() => {
    mover.setElement(lowerFillRef.current);
    patternMover.setElement(lowerPatternRef.current);
    return () => {
      mover.setElement(null);
      patternMover.setElement(null);
    };
  }, [mover, patternMover, hasPattern]);

  return (
    <>
      <div aria-hidden data-flow-skin="" ref={upperRef}>
        <div ref={upperFillRef}>
          {hasPattern ? <div ref={upperPatternRef} /> : null}
        </div>
      </div>
      <div aria-hidden data-flow-skin="" ref={lowerRef}>
        <div ref={lowerFillRef}>
          {hasPattern ? <div ref={lowerPatternRef} /> : null}
        </div>
      </div>
    </>
  );
}

export interface FlowSurfaceOption {
  /**
   * The element paints a surface, and a `Disclosure` can be in it: during the
   * motion, the lower edge of the surface moves with the panel. Set it once.
   *
   * @zh 元素绘制一个表面，且其中可以有 `Disclosure`：动画期间，表面的下边缘随面板移动。只需设置一次。
   */
  surface?: boolean;
}

interface FlowBlockOptions extends FlowSurfaceOption {
  /** The element has `position: sticky`, so a stuck box stays on the screen. */
  sticky?: boolean;
  /**
   * Script places the element from its size, as for a `Popover`. A motion calls
   * this in each layout that it measures. It must place the element at once.
   */
  place?: () => void;
}

interface FlowBlockRef {
  /** Attach to the element. It takes one offset, on its `translate`. */
  ref: RefCallback<HTMLElement>;
  /** Render as the last child of the element. It shows only during a motion. */
  skin: ReactNode;
}

function createBlockRef(
  { surface: isSurface = false, sticky = false, place }: FlowBlockOptions,
  showSkin: (plan: SkinPlan | null) => void,
): RefCallback<HTMLElement> {
  let surface: FlowSurface | null = null;
  const block: FlowBlock & { element: HTMLElement | null } = {
    element: null,
    isSticky: sticky,
    place,
    mover: createFlowMover(),
    get surface() {
      if (isSurface) surface ??= createSurface(block, showSkin);
      return surface;
    },
  };
  return (element) => {
    if (element === null) return;
    block.element = element;
    block.mover.setElement(element);
    const remove = addFlowBlock(block);
    return () => {
      remove();
      block.mover.setElement(null);
      block.element = null;
    };
  };
}

/**
 * Makes an element take part in the motion of each `Disclosure` on the page. A
 * press measures each block in the two layouts, and each block moves itself. A
 * block moves with the blocks around it, so register one at the coarsest level
 * that moves as one. What a press moves and no block covers jumps at the press,
 * and the check in development reports it.
 */
export function useFlowBlock(options: FlowBlockOptions = {}): FlowBlockRef {
  const [plan, setPlan] = useState<SkinPlan | null>(null);
  const [ref] = useState(() => createBlockRef(options, setPlan));
  return {
    ref,
    skin: plan === null ? null : <FlowSkin skin={plan} />,
  };
}
