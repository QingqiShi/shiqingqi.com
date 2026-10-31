import { overlaps } from "../motion/play-layout.ts";
import type { CarrierClock, ElementTracker } from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type { ElementBox } from "./read-element-box.ts";
import {
  PAGE_CARRIER,
  reachableCarriers,
  type CarrierKey,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";
import type { EffectSettings, MeasuredElement } from "./types.ts";

/**
 * Where a registration puts its element: the scope it is in, the scope it
 * holds as an Effect container, or `null`, whether it is an Effect cover,
 * whether that cover is modal, and the Effect carrier it declares, which is
 * the page when it declares none.
 *
 * @internal
 */
export interface EffectPlacement {
  readonly scope: number;
  readonly holds: number | null;
  readonly covers?: boolean;
  readonly modal?: boolean;
  readonly carrier?: EffectCarrierRef;
}

/**
 * One registered element. An element registered more than once, by several
 * effect hooks for example, is one entry: its roles are every role the
 * registrations add, each effect's settings come from the latest
 * registration that has them, its scope and its carrier from the latest
 * registration, and the scope it holds from the latest registration that
 * holds one.
 *
 * @internal
 */
export interface RegisteredElement extends EffectPlacement {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  /** One bit per role, as `EFFECT_ROLES` orders them. */
  readonly roles: number;
  readonly settings: EffectSettings;
  readonly carrier: EffectCarrierRef;
  /**
   * The carrier that the element is on: its own sticky carrier when it is a
   * sticky box on `carrier`, the parent of a Scroll region when it is the
   * scroller of that region, else `carrier`.
   */
  readonly ownCarrier: EffectCarrierRef;
  /** Every carrier that the elements on `ownCarrier` can draw on now. */
  readonly carriers: readonly CarrierKey[];
}

/**
 * One registration of an element, which an effect hook keeps while its ref
 * stays attached.
 *
 * @internal
 */
export interface EffectRegistration {
  /**
   * Changes the roles, the settings, the scope and the carrier, and keeps
   * the element's id.
   */
  update: (
    roles: number,
    settings: EffectSettings,
    scope: number,
    carrier: EffectCarrierRef,
  ) => void;
  remove: () => void;
}

/**
 * A sticky box that `useEffectSticky` declares as a carrier: its box, the
 * sticky carrier, and whether it is stuck now, from the stuck watch of the
 * hook.
 *
 * @internal
 */
export interface RegisteredSticky {
  readonly element: Element;
  readonly carrier: EffectCarrierRef & { readonly kind: "sticky" };
  readonly isStuck: () => boolean;
}

/**
 * One registration of a sticky box, which `useEffectSticky` keeps while its
 * ref stays attached.
 *
 * @internal
 */
export interface StickyRegistration {
  /** Tells the layer that the box stuck or let go. */
  changed: () => void;
  remove: () => void;
}

/**
 * A Scroll region that `useScrollRegion` declares, with its scroller and
 * its content box, and the carrier that it is on.
 *
 * @internal
 */
export interface RegisteredRegion {
  readonly id: number;
  readonly scroller: Element;
  readonly content: Element;
  readonly parent: EffectCarrierRef;
}

/**
 * What the effect layer keeps for a Scroll region while it tracks it.
 *
 * @internal
 */
export interface RegionWatch {
  destroy: () => void;
}

function entriesEqual(
  first: object,
  second: object,
  valuesEqual: (first: unknown, second: unknown) => boolean,
) {
  const firstEntries: [string, unknown][] = Object.entries(first);
  const secondValues = new Map<string, unknown>(Object.entries(second));
  return (
    firstEntries.length === secondValues.size &&
    firstEntries.every(
      ([key, value]) =>
        secondValues.has(key) && valuesEqual(value, secondValues.get(key)),
    )
  );
}

function settingsEqual(first: EffectSettings, second: EffectSettings) {
  return entriesEqual(
    first,
    second,
    (firstEffect, secondEffect) =>
      firstEffect === secondEffect ||
      (typeof firstEffect === "object" &&
        firstEffect !== null &&
        typeof secondEffect === "object" &&
        secondEffect !== null &&
        entriesEqual(firstEffect, secondEffect, Object.is)),
  );
}

/**
 * The elements registered on one effect layer. React reads `getRoles`
 * through `useSyncExternalStore`. While the effect layer tracks them, each
 * element keeps its own tracker on its entry, and the layer reads `records`
 * each frame.
 *
 * @internal
 */
export function createEffectRegistry() {
  interface Registration extends EffectPlacement {
    roles: number;
    settings: EffectSettings;
    scope: number;
    carrier: EffectCarrierRef;
  }
  interface Region {
    readonly id: number;
    readonly parent: EffectCarrierRef;
    scroller: Element | null;
    content: Element | null;
    /** The region while it has both parts. */
    complete: RegisteredRegion | undefined;
    watch: RegionWatch | null;
  }
  interface Use {
    id: number;
    registrations: Set<Registration>;
    tracker: ElementTracker | null;
    /** How many `click` events the element has had since it registered. */
    clicks: number;
    stopClicks: () => void;
  }
  const uses = new Map<Element, Use>();
  const stickies = new Map<number, RegisteredSticky>();
  const regions = new Map<number, Region>();
  let createTracker: ((element: Element) => ElementTracker) | null = null;
  let onStuck: ((id: number) => void) | null = null;
  let watchRegion: ((region: RegisteredRegion) => RegionWatch) | null = null;
  const listeners = new Set<() => void>();
  let elements: ReadonlyMap<Element, RegisteredElement> = new Map();
  let modalElements: Element[] = [];
  let roles = 0;
  let nextId = 1;

  /**
   * The carrier of an element that declares `declared`: the sticky carrier
   * of the element when it is a sticky box on `declared`, the parent of a
   * Scroll region when it is the scroller of that region, or `declared`.
   */
  function ownCarrier(element: Element, declared: EffectCarrierRef) {
    for (const sticky of stickies.values()) {
      if (sticky.element === element && sticky.carrier.parent === declared) {
        return sticky.carrier;
      }
    }
    if (declared.kind === "region") {
      const region = regions.get(declared.id);
      if (region?.scroller === element) {
        return region.parent;
      }
    }
    return declared;
  }

  /** The region `id` when it has its scroller and its content box. */
  const completeRegion = (id: number) => regions.get(id)?.complete;
  const hasRegion = (id: number) => completeRegion(id) !== undefined;

  function setPart(
    region: Region,
    part: "scroller" | "content",
    element: Element | null,
  ) {
    region[part] = element;
    const { id, parent, scroller, content } = region;
    region.complete =
      scroller === null || content === null
        ? undefined
        : { id, parent, scroller, content };
  }

  function notify() {
    const next = new Map<Element, RegisteredElement>();
    modalElements = [];
    roles = 0;
    for (const [element, { id, registrations }] of uses) {
      let elementRoles = 0;
      let settings = NO_SETTINGS;
      let scope = PAGE_SCOPE;
      let holds: number | null = null;
      let covers = false;
      let modal = false;
      let carrier = PAGE_CARRIER;
      for (const registration of registrations) {
        elementRoles |= registration.roles;
        scope = registration.scope;
        carrier = registration.carrier;
        holds = registration.holds ?? holds;
        covers ||= registration.covers === true;
        modal ||= registration.covers === true && registration.modal === true;
        settings =
          registrations.size === 1
            ? registration.settings
            : { ...settings, ...registration.settings };
      }
      const own = ownCarrier(element, carrier);
      next.set(element, {
        id,
        roles: elementRoles,
        settings,
        scope,
        holds,
        covers,
        modal,
        carrier,
        ownCarrier: own,
        carriers: reachableCarriers(own, hasRegion),
      });
      if (modal) {
        modalElements.push(element);
      }
      roles |= elementRoles;
    }
    elements = next;
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * A new entry for `element`, which counts its `click` events and asks for
   * a frame after each one.
   */
  function countClicks(element: Element): Use {
    const onClick = () => {
      use.clicks += 1;
      for (const listener of listeners) {
        listener();
      }
    };
    const use: Use = {
      id: nextId++,
      registrations: new Set(),
      tracker: createTracker?.(element) ?? null,
      clicks: 0,
      stopClicks: () => {
        element.removeEventListener("click", onClick);
      },
    };
    element.addEventListener("click", onClick);
    return use;
  }

  /** Starts or stops the watch of a region as it gains or loses a part. */
  function rewatchRegion(region: Region) {
    region.watch?.destroy();
    region.watch =
      region.complete === undefined
        ? null
        : (watchRegion?.(region.complete) ?? null);
  }

  function isMeasured(element: Element) {
    return uses.get(element)?.tracker?.measured != null;
  }

  return {
    /**
     * Adds an element and returns the registration that changes or removes
     * it. `placement` gives the scope the element is in, the scope it holds
     * when it is an Effect container, whether it is an Effect cover, and its
     * carrier.
     */
    register: (
      element: Element,
      elementRoles: number,
      settings: EffectSettings,
      placement: EffectPlacement,
    ): EffectRegistration => {
      const known = uses.get(element);
      const use = known ?? countClicks(element);
      uses.set(element, use);
      const { registrations } = use;
      const registration: Registration = {
        ...placement,
        carrier: placement.carrier ?? PAGE_CARRIER,
        roles: elementRoles,
        settings,
      };
      registrations.add(registration);
      notify();
      if (known !== undefined) {
        use.tracker?.signal();
      }
      return {
        update: (nextRoles, nextSettings, nextScope, nextCarrier) => {
          if (
            !registrations.has(registration) ||
            (registration.roles === nextRoles &&
              registration.scope === nextScope &&
              registration.carrier === nextCarrier &&
              settingsEqual(registration.settings, nextSettings))
          ) {
            return;
          }
          const remeasure =
            registration.carrier !== nextCarrier ||
            registration.roles !== nextRoles;
          registration.roles = nextRoles;
          registration.settings = nextSettings;
          registration.scope = nextScope;
          registration.carrier = nextCarrier;
          notify();
          if (remeasure) {
            use.tracker?.signal();
          }
        },
        remove: () => {
          if (!registrations.delete(registration)) {
            return;
          }
          if (registrations.size === 0) {
            use.tracker?.destroy();
            use.stopClicks();
            uses.delete(element);
          }
          notify();
        },
      };
    },
    /**
     * Adds the sticky box of the sticky carrier `carrier`, and returns the
     * registration that tells when it sticks or lets go, or removes it.
     * `isStuck` tells whether it is stuck now. The box is not an element of
     * the frame, so it changes no effect. The effect hooks of the box itself
     * that are on the parent of `carrier` are on `carrier` too.
     */
    registerSticky: (
      element: Element,
      carrier: EffectCarrierRef & { readonly kind: "sticky" },
      isStuck: () => boolean,
    ): StickyRegistration => {
      const { id } = carrier;
      const sticky: RegisteredSticky = { element, carrier, isStuck };
      stickies.set(id, sticky);
      notify();
      uses.get(element)?.tracker?.signal();
      onStuck?.(id);
      return {
        changed: () => {
          if (stickies.get(id) === sticky) {
            onStuck?.(id);
          }
        },
        remove: () => {
          if (stickies.get(id) === sticky) {
            onStuck?.(id);
            stickies.delete(id);
            notify();
            uses.get(element)?.tracker?.signal();
          }
        },
      };
    },
    /**
     * Adds one part of the Scroll region `id`, which is on the carrier
     * `parent`: its scroller or its content box. Returns a function that
     * removes that part. The layer tracks the region while it has both
     * parts. Until then, the elements on it draw on `parent`. The effect
     * hooks of the scroller itself are on `parent`.
     */
    registerRegion: (
      id: number,
      parent: EffectCarrierRef,
      part: "scroller" | "content",
      element: Element,
    ): (() => void) => {
      let region = regions.get(id);
      if (region?.parent !== parent) {
        region?.watch?.destroy();
        region = {
          id,
          parent,
          scroller: region?.scroller ?? null,
          content: region?.content ?? null,
          complete: undefined,
          watch: null,
        };
        regions.set(id, region);
      }
      const added = region;
      setPart(added, part, element);
      notify();
      rewatchRegion(added);
      uses.get(element)?.tracker?.signal();
      return () => {
        if (regions.get(id) !== added || added[part] !== element) {
          return;
        }
        setPart(added, part, null);
        if (added.scroller === null && added.content === null) {
          regions.delete(id);
        }
        notify();
        rewatchRegion(added);
        uses.get(element)?.tracker?.signal();
      };
    },
    /** The sticky box of the sticky carrier `id`, or `undefined`. */
    sticky: (id: number): RegisteredSticky | undefined => stickies.get(id),
    /**
     * The Scroll region `id` when it has its scroller and its content box,
     * or `undefined`.
     */
    region: completeRegion,
    /** The id of the Scroll region whose scroller `element` is, if any. */
    regionOfScroller: (element: Element): number | undefined => {
      for (const region of regions.values()) {
        if (region.scroller === element && region.content !== null) {
          return region.id;
        }
      }
      return undefined;
    },
    /** The carrier of a registered element, or the page. */
    carrierOf: (element: Element) =>
      elements.get(element)?.ownCarrier ?? PAGE_CARRIER,
    /**
     * Whether a running layer has measured `element` with a box, so an
     * effect can draw for it now.
     */
    isMeasured,
    /** The roles of a registered element, or 0. */
    rolesOf: (element: Element) => elements.get(element)?.roles ?? 0,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Every role that some registered element has. */
    getRoles: () => roles,
    /** Every registered element, in the order they first registered. */
    elements: () => elements,
    /**
     * Gives each registered element a tracker from `create`, and each Scroll
     * region a watch from `region`, now and as they register, and destroys
     * them when they leave. Calls `stuck` with the id of a sticky box when
     * it registers, sticks, lets go or leaves. Returns a function that
     * destroys every tracker and every watch, and stops.
     */
    track: (
      create: (element: Element) => ElementTracker,
      stuck?: (id: number) => void,
      region?: (region: RegisteredRegion) => RegionWatch,
    ) => {
      createTracker = create;
      onStuck = stuck ?? null;
      watchRegion = region ?? null;
      for (const [element, use] of uses) {
        use.tracker = create(element);
      }
      for (const entry of regions.values()) {
        rewatchRegion(entry);
      }
      return () => {
        createTracker = null;
        onStuck = null;
        watchRegion = null;
        for (const use of uses.values()) {
          use.tracker?.destroy();
          use.tracker = null;
        }
        for (const entry of regions.values()) {
          entry.watch?.destroy();
          entry.watch = null;
        }
      };
    },
    /** The tracker of each registered element, in registration order. */
    *trackers() {
      for (const { tracker } of uses.values()) {
        if (tracker !== null) {
          yield tracker;
        }
      }
    },
    /**
     * Each modal Effect cover that has a box now, as it was last measured.
     */
    modalCovers: (): Element[] => modalElements.filter(isMeasured),
    /** Whether `element` is in a registered modal Effect cover, or is one. */
    isInModalCover: (element: Element) =>
      modalElements.some((cover) => cover.contains(element)),
    /**
     * Every tracked element with a box, as it was last measured, in page
     * coordinates at the time of `clock`, in registration order. Each one
     * draws on the carrier it was measured on. An Effect cover is not one of
     * them, and neither is an element that the box of a cover overlaps and
     * that is not inside that cover.
     */
    records: (clock: CarrierClock): MeasuredElement[] => {
      const records: MeasuredElement[] = [];
      const covers: { element: Element; box: ElementBox }[] = [];
      for (const [
        element,
        { id, roles, settings, scope, holds, covers: isCover, carriers },
      ] of elements) {
        const use = uses.get(element);
        const box = use?.tracker?.boxAt(clock);
        const measured = use?.tracker?.measured;
        if (use === undefined || box == null || measured == null) {
          continue;
        }
        if (isCover === true) {
          covers.push({ element, box });
          continue;
        }
        records.push({
          ...box,
          id,
          element,
          readings: measured.readings,
          roles,
          settings,
          clicks: use.clicks,
          scope,
          holds,
          carrier: measured.carrier.key,
          carriers: carriers.includes(measured.carrier.key)
            ? carriers
            : [...carriers, measured.carrier.key],
        });
      }
      return records.filter((record) =>
        covers.every(
          ({ element, box }) =>
            element.contains(record.element) || !overlaps(box, record),
        ),
      );
    },
  };
}

/** @internal */
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;
