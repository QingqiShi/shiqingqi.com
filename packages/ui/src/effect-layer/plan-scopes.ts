import { isDarkBackground } from "./dust-color.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import type {
  EffectCanvas,
  EffectElementRecord,
  EffectScope,
  EffectStage,
  ElementRange,
  MeasuredElement,
} from "./types.ts";

/**
 * The scope of every element outside all Effect containers, and its index in
 * `EffectFrame.scopes`.
 *
 * @internal
 */
export const PAGE_SCOPE = 0;

/**
 * The `<canvas>` elements in the order of their elements, and of each
 * scope's ranges.
 *
 * @internal
 */
export const CANVAS_ORDER: readonly EffectCanvas[] = [
  "scroll",
  "fixed",
  "fixedBottom",
  "stageUnder",
  "stageOver",
];

/**
 * The `<canvas>` element a record draws on. An element on an Effect stage
 * draws on the stage's, fixed or not: the stage carries it.
 *
 * @internal
 */
export function canvasOf({
  fixed,
  fixedToBottom,
  stage,
}: Pick<MeasuredElement, "fixed" | "fixedToBottom" | "stage">): EffectCanvas {
  if (stage !== null) {
    return stage.side === "under" ? "stageUnder" : "stageOver";
  }
  if (!fixed) {
    return "scroll";
  }
  return fixedToBottom ? "fixedBottom" : "fixed";
}

/** A fill at least this opaque is what a scope's effects draw over. */
const OPAQUE_BACKDROP = 0.5;
const WHITE: EffectColor = [1, 1, 1, 1];

/**
 * What the page's effects draw over: the fill of the root element, or else
 * of the body, that is at least half opaque, or else white, the canvas of a
 * page with no fill.
 *
 * @internal
 */
export function readPageBackdrop(): EffectColor {
  for (const element of [document.documentElement, document.body]) {
    const fill = readFill(getComputedStyle(element).backgroundColor);
    if (fill[3] >= OPAQUE_BACKDROP) {
      return fill;
    }
  }
  return WHITE;
}

/**
 * The elements of one `<canvas>` element as a range of
 * `EffectFrame.elements`.
 *
 * @internal
 */
export interface CanvasRange extends ElementRange {
  /**
   * An element with a role is in the range, or sticks to the viewport and
   * can move into it, so its `<canvas>` element is needed.
   */
  readonly hasRole: boolean;
}

/**
 * One Effect stage of a frame: the index in `ScopePlan.elements` of the
 * stage, what it carries, and the elements inside it, which draw over it.
 *
 * @internal
 */
export interface StagePlan {
  readonly element: number;
  readonly carries: EffectStage;
  readonly over: ElementRange;
}

/**
 * The elements and scopes of one frame, and where each `<canvas>` element's
 * elements are.
 *
 * @internal
 */
export interface ScopePlan {
  /**
   * The measured elements, the ones in the document, then the fixed ones,
   * then the ones fixed to the bottom, each group by scope, less each
   * element whose Effect container, or a container around that one, has no
   * box.
   */
  readonly elements: readonly EffectElementRecord[];
  /** The elements in the document, which draw on the bands. */
  readonly document: CanvasRange;
  /** The fixed elements, which draw on the fixed `<canvas>` element. */
  readonly fixed: CanvasRange;
  /**
   * The elements fixed to the viewport's bottom edge, which draw on the
   * bottom `<canvas>` element.
   */
  readonly fixedBottom: CanvasRange;
  /** Each Effect stage with a box, in the order of `elements`. */
  readonly stages: readonly StagePlan[];
  /** The page first, then the scope of each Effect container with a box. */
  readonly scopes: readonly EffectScope[];
}

/**
 * The range of `EffectFrame.elements` with the elements that the effects of
 * a record can meet: those of its scope on its `<canvas>` element.
 *
 * @internal
 */
export function peersOf(
  scopes: readonly EffectScope[],
  record: Pick<
    EffectElementRecord,
    "scopeIndex" | "fixed" | "fixedToBottom" | "stage"
  >,
): ElementRange {
  return scopes[record.scopeIndex][canvasOf(record)];
}

/**
 * Each index of a range of `EffectFrame.elements`.
 *
 * @internal
 */
export function* indicesIn({ firstElement, elementCount }: ElementRange) {
  for (let index = firstElement; index < firstElement + elementCount; index++) {
    yield index;
  }
}

/**
 * Puts the measured elements in scopes, and orders them so that each scope
 * is one range on each `<canvas>` element, and each Effect stage one range
 * of the elements over it. An element whose Effect container has no box,
 * because its ref is not attached yet or the container is not measured, is
 * left out until the container has one, and so is an element on a stage
 * that has no box.
 *
 * @internal
 */
export function planScopes(
  records: readonly MeasuredElement[],
  pageBackdrop: EffectColor,
): ScopePlan {
  const holders = new Map<number, MeasuredElement>();
  for (const record of records) {
    if (record.holds !== null) {
      holders.set(record.holds, record);
    }
  }

  const reachesPage = new Map<number, boolean>([[PAGE_SCOPE, true]]);
  function isPlaced(scope: number): boolean {
    const known = reachesPage.get(scope);
    if (known !== undefined) {
      return known;
    }
    // Stops a loop of containers.
    reachesPage.set(scope, false);
    const holder = holders.get(scope);
    const placed = holder !== undefined && isPlaced(holder.scope);
    reachesPage.set(scope, placed);
    return placed;
  }

  const scopeIds = [
    PAGE_SCOPE,
    ...[...holders.keys()].filter((scope) => isPlaced(scope)),
  ];
  const indexOfScope = new Map(scopeIds.map((id, index) => [id, index]));
  const stageIds = new Set(
    records.flatMap((record) =>
      record.stage?.side === "under" ? [record.id] : [],
    ),
  );
  const elements = records
    .flatMap((record): EffectElementRecord[] => {
      const scopeIndex = indexOfScope.get(record.scope);
      const onStage = record.stage === null || stageIds.has(record.stage.host);
      return scopeIndex === undefined || !onStage
        ? []
        : [{ ...record, scopeIndex }];
    })
    .sort(
      (first, second) =>
        CANVAS_ORDER.indexOf(canvasOf(first)) -
          CANVAS_ORDER.indexOf(canvasOf(second)) ||
        first.scopeIndex - second.scopeIndex ||
        (first.stage?.host ?? 0) - (second.stage?.host ?? 0),
    );

  const indexOfId = new Map(
    elements.map((record, index) => [record.id, index]),
  );
  const emptyRange = () => ({ firstElement: 0, elementCount: 0 });
  const emptyRanges = (): Record<
    EffectCanvas,
    { firstElement: number; elementCount: number }
  > => ({
    scroll: emptyRange(),
    fixed: emptyRange(),
    fixedBottom: emptyRange(),
    stageUnder: emptyRange(),
    stageOver: emptyRange(),
  });
  const ranges = scopeIds.map(emptyRanges);
  const counts = { scroll: 0, fixed: 0, fixedBottom: 0 };
  const hasRole = { scroll: false, fixed: false, fixedBottom: false };
  const overRanges = new Map<
    number,
    { firstElement: number; elementCount: number }
  >();
  for (const [index, record] of elements.entries()) {
    const canvas = canvasOf(record);
    const range = ranges[record.scopeIndex][canvas];
    if (range.elementCount === 0) {
      range.firstElement = index;
    }
    range.elementCount += 1;
    if (canvas === "stageOver" && record.stage !== null) {
      const over = overRanges.get(record.stage.host) ?? {
        firstElement: index,
        elementCount: 0,
      };
      over.elementCount += 1;
      overRanges.set(record.stage.host, over);
      continue;
    }
    if (canvas === "stageUnder" || canvas === "stageOver") {
      continue;
    }
    counts[canvas] += 1;
    if (record.roles !== 0) {
      hasRole[canvas] = true;
      if (record.sticksToViewport) {
        hasRole.scroll = true;
        hasRole.fixed = true;
      }
    }
  }
  const stages = elements.flatMap((record, index): StagePlan[] =>
    record.stage?.side === "under" && record.carries !== null
      ? [
          {
            element: index,
            carries: record.carries,
            over: overRanges.get(record.id) ?? {
              firstElement: 0,
              elementCount: 0,
            },
          },
        ]
      : [],
  );

  const backdrops: EffectColor[] = [pageBackdrop];
  function backdropOf(scopeIndex: number): EffectColor {
    const known = backdrops.at(scopeIndex);
    if (known !== undefined) {
      return known;
    }
    const container = elements[containerOf(scopeIndex)];
    const backdrop =
      container.fill[3] >= OPAQUE_BACKDROP
        ? container.fill
        : backdropOf(container.scopeIndex);
    backdrops[scopeIndex] = backdrop;
    return backdrop;
  }
  function containerOf(scopeIndex: number) {
    const holder = holders.get(scopeIds[scopeIndex]);
    return scopeIndex === PAGE_SCOPE || holder === undefined
      ? -1
      : (indexOfId.get(holder.id) ?? -1);
  }

  return {
    elements,
    document: {
      firstElement: 0,
      elementCount: counts.scroll,
      hasRole: hasRole.scroll,
    },
    fixed: {
      firstElement: counts.scroll,
      elementCount: counts.fixed,
      hasRole: hasRole.fixed,
    },
    fixedBottom: {
      firstElement: counts.scroll + counts.fixed,
      elementCount: counts.fixedBottom,
      hasRole: hasRole.fixedBottom,
    },
    stages,
    scopes: scopeIds.map((id, index) => {
      const backdrop = backdropOf(index);
      return {
        id,
        container: containerOf(index),
        backdrop,
        dark: isDarkBackground(backdrop),
        ...ranges[index],
      };
    }),
  };
}
