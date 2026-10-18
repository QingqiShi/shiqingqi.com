import { isDarkBackground } from "./dust-color.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import type {
  EffectCanvas,
  EffectElementRecord,
  EffectScope,
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
];

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
   * An element with a role is in the range, or is on a sticky carrier and
   * can move into it, so its `<canvas>` element is needed.
   */
  readonly hasRole: boolean;
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
  record: Pick<EffectElementRecord, "scopeIndex" | "canvas">,
): ElementRange {
  return scopes[record.scopeIndex][record.canvas];
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
 * is one range on each `<canvas>` element. An element whose Effect container
 * has no box, because its ref is not attached yet or the container is not
 * measured, is left out until the container has one.
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
  const elements = records
    .flatMap((record): EffectElementRecord[] => {
      const scopeIndex = indexOfScope.get(record.scope);
      return scopeIndex === undefined ? [] : [{ ...record, scopeIndex }];
    })
    .sort(
      (first, second) =>
        CANVAS_ORDER.indexOf(first.canvas) -
          CANVAS_ORDER.indexOf(second.canvas) ||
        first.scopeIndex - second.scopeIndex,
    );

  const indexOfId = new Map(
    elements.map((record, index) => [record.id, index]),
  );
  const ranges = scopeIds.map(() => ({
    scroll: { firstElement: 0, elementCount: 0 },
    fixed: { firstElement: 0, elementCount: 0 },
    fixedBottom: { firstElement: 0, elementCount: 0 },
  }));
  const counts = { scroll: 0, fixed: 0, fixedBottom: 0 };
  const hasRole = { scroll: false, fixed: false, fixedBottom: false };
  for (const [index, record] of elements.entries()) {
    const { canvas } = record;
    const range = ranges[record.scopeIndex][canvas];
    if (range.elementCount === 0) {
      range.firstElement = index;
    }
    range.elementCount += 1;
    counts[canvas] += 1;
    if (record.roles !== 0) {
      for (const reachable of record.canvases) {
        hasRole[reachable] = true;
      }
    }
  }

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
