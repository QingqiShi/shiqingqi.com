import { carrierOf } from "./carrier-of.ts";
import { isDarkBackground } from "./dust-color.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import { FIXED_CARRIER_KEYS, type CarrierKey } from "./resolve-carrier.ts";
import type {
  CanvasNeed,
  EffectElementRecord,
  EffectScope,
  ElementRange,
  MeasuredElement,
  RegionLookup,
} from "./types.ts";

/**
 * The scope of every element outside all Effect containers, and its index in
 * `EffectFrame.scopes`.
 *
 * @internal
 */
export const PAGE_SCOPE = 0;

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
export function readPageBackdrop(
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
): EffectColor {
  for (const element of [document.documentElement, document.body]) {
    const fill = readFill(styleOf(element).backgroundColor);
    if (fill[3] >= OPAQUE_BACKDROP) {
      return fill;
    }
  }
  return WHITE;
}

/**
 * The elements of one carrier as a range of `EffectFrame.elements`.
 *
 * @internal
 */
export interface CarrierRange extends ElementRange {
  /**
   * An element with a role is in the range, or is on a sticky carrier and
   * can move into it, so the carrier's `<canvas>` elements are needed.
   */
  readonly hasRole: boolean;
}

/**
 * The elements and scopes of one frame, and where the elements of each
 * carrier are.
 *
 * @internal
 */
export interface ScopePlan {
  /**
   * The measured elements, grouped by carrier in the order of `carriers`,
   * each group by scope, less each element whose Effect container, or a
   * container around that one, has no box.
   */
  readonly elements: readonly EffectElementRecord[];
  /**
   * The page, the viewport, the viewport's bottom edge, then each Scroll
   * region that an element can draw on, by id.
   */
  readonly carriers: readonly CarrierKey[];
  /** The elements of each carrier, in the order of `carriers`. */
  readonly ranges: readonly CarrierRange[];
  /** The page first, then the scope of each Effect container with a box. */
  readonly scopes: readonly EffectScope[];
}

/**
 * The range of `EffectFrame.elements` with the elements that the effects of
 * a record can meet: those of its scope on its carrier.
 *
 * @internal
 */
export function peersOf(
  scopes: readonly EffectScope[],
  record: Pick<EffectElementRecord, "scopeIndex" | "carrierIndex">,
): ElementRange {
  return scopes[record.scopeIndex].ranges[record.carrierIndex];
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
 * Each carrier that the records can draw on, in the order of
 * `ScopePlan.carriers`.
 */
function carriersOf(records: readonly MeasuredElement[]): CarrierKey[] {
  const regions = new Set<number>();
  for (const record of records) {
    for (const key of record.carriers) {
      if (typeof key === "number") {
        regions.add(key);
      }
    }
  }
  return [
    ...FIXED_CARRIER_KEYS,
    ...[...regions].sort((first, second) => first - second),
  ];
}

/**
 * Puts the measured elements in scopes, and orders them so that each scope
 * is one range on each carrier. An element whose Effect container has no
 * box, because its ref is not attached yet or the container is not
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

  const carriers = carriersOf(records);
  const indexOfCarrier = new Map(carriers.map((key, index) => [key, index]));
  const scopeIds = [
    PAGE_SCOPE,
    ...[...holders.keys()].filter((scope) => isPlaced(scope)),
  ];
  const indexOfScope = new Map(scopeIds.map((id, index) => [id, index]));
  const elements = records
    .flatMap((record): EffectElementRecord[] => {
      const scopeIndex = indexOfScope.get(record.scope);
      const carrierIndex = indexOfCarrier.get(record.carrier);
      return scopeIndex === undefined || carrierIndex === undefined
        ? []
        : [{ ...record, scopeIndex, carrierIndex }];
    })
    .sort(
      (first, second) =>
        first.carrierIndex - second.carrierIndex ||
        first.scopeIndex - second.scopeIndex,
    );

  const indexOfId = new Map(
    elements.map((record, index) => [record.id, index]),
  );
  const scopeRanges = scopeIds.map(() =>
    carriers.map(() => ({ firstElement: 0, elementCount: 0 })),
  );
  const counts = carriers.map(() => 0);
  const hasRole = carriers.map(() => false);
  for (const [index, record] of elements.entries()) {
    const range = scopeRanges[record.scopeIndex][record.carrierIndex];
    if (range.elementCount === 0) {
      range.firstElement = index;
    }
    range.elementCount += 1;
    counts[record.carrierIndex] += 1;
    if (record.roles !== 0) {
      for (const reachable of record.carriers) {
        const carrierIndex = indexOfCarrier.get(reachable);
        if (carrierIndex !== undefined) {
          hasRole[carrierIndex] = true;
        }
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

  let firstElement = 0;
  const ranges = carriers.map((_, index) => {
    const range = {
      firstElement,
      elementCount: counts[index],
      hasRole: hasRole[index],
    };
    firstElement += counts[index];
    return range;
  });

  return {
    elements,
    carriers,
    ranges,
    scopes: scopeIds.map((id, index) => {
      const backdrop = backdropOf(index);
      return {
        id,
        container: containerOf(index),
        backdrop,
        dark: isDarkBackground(backdrop),
        ranges: scopeRanges[index],
      };
    }),
  };
}

/**
 * The `<canvas>` elements that a plan needs: those of each carrier with an
 * element with a role or in `held`, as `Carrier.need` gives them. While a modal Effect
 * cover in `modalCovers` shows, the page and each Scroll region outside
 * every modal cover need none: nothing on them can show or move. Their
 * elements stay in the plan, so the effects keep their state.
 *
 * @internal
 */
export function planCanvasNeeds(
  plan: Pick<ScopePlan, "carriers" | "ranges">,
  modalCovers: readonly Element[],
  region: RegionLookup,
  held: ReadonlySet<CarrierKey> = new Set(),
): CanvasNeed[] {
  return plan.carriers.flatMap((key, index) => {
    const need =
      plan.ranges[index].hasRole || held.has(key)
        ? carrierOf(key).need(modalCovers, region)
        : null;
    return need === null ? [] : [need];
  });
}
