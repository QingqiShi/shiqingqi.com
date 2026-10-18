import type { ElementTracker } from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type { ElementBox } from "./read-element-box.ts";
import {
  carrierCanvases,
  PAGE_CARRIER,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";
import type { EffectCanvas, EffectSettings, MeasuredElement } from "./types.ts";

/**
 * Where a registration puts its element: the scope it is in, the scope it
 * holds as an Effect container, or `null`, whether it is an Effect cover,
 * and the Effect carrier it declares, which is the page when it declares
 * none.
 *
 * @internal
 */
export interface EffectPlacement {
  readonly scope: number;
  readonly holds: number | null;
  readonly covers?: boolean;
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
   * sticky box on `carrier`, else `carrier`.
   */
  readonly ownCarrier: EffectCarrierRef;
  /** Every `<canvas>` element that the elements on `ownCarrier` can draw on. */
  readonly canvases: readonly EffectCanvas[];
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

function overlaps(first: ElementBox, second: ElementBox) {
  return (
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  );
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
  const uses = new Map<
    Element,
    {
      id: number;
      registrations: Set<Registration>;
      tracker: ElementTracker | null;
    }
  >();
  const stickies = new Map<number, RegisteredSticky>();
  let createTracker: ((element: Element) => ElementTracker) | null = null;
  let onStuck: ((id: number) => void) | null = null;
  const listeners = new Set<() => void>();
  let elements: ReadonlyMap<Element, RegisteredElement> = new Map();
  let roles = 0;
  let nextId = 1;

  /**
   * The carrier of an element that declares `declared`: the sticky carrier
   * of the element when it is a sticky box on `declared`, or `declared`.
   */
  function ownCarrier(element: Element, declared: EffectCarrierRef) {
    for (const sticky of stickies.values()) {
      if (sticky.element === element && sticky.carrier.parent === declared) {
        return sticky.carrier;
      }
    }
    return declared;
  }

  function notify() {
    const next = new Map<Element, RegisteredElement>();
    roles = 0;
    for (const [element, { id, registrations }] of uses) {
      let elementRoles = 0;
      let settings = NO_SETTINGS;
      let scope = PAGE_SCOPE;
      let holds: number | null = null;
      let covers = false;
      let carrier = PAGE_CARRIER;
      for (const registration of registrations) {
        elementRoles |= registration.roles;
        scope = registration.scope;
        carrier = registration.carrier;
        holds = registration.holds ?? holds;
        covers ||= registration.covers === true;
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
        carrier,
        ownCarrier: own,
        canvases: carrierCanvases(own),
      });
      roles |= elementRoles;
    }
    elements = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    /**
     * Adds an element and returns the registration that changes or removes
     * it. `placement` gives the scope the element is in, the scope it holds
     * when it is an Effect container, and its carrier.
     */
    register: (
      element: Element,
      elementRoles: number,
      settings: EffectSettings,
      placement: EffectPlacement,
    ): EffectRegistration => {
      const use = uses.get(element) ?? {
        id: nextId++,
        registrations: new Set(),
        tracker: createTracker?.(element) ?? null,
      };
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
          const carrierChanged = registration.carrier !== nextCarrier;
          registration.roles = nextRoles;
          registration.settings = nextSettings;
          registration.scope = nextScope;
          registration.carrier = nextCarrier;
          notify();
          if (carrierChanged) {
            use.tracker?.signal();
          }
        },
        remove: () => {
          if (!registrations.delete(registration)) {
            return;
          }
          if (registrations.size === 0) {
            use.tracker?.destroy();
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
    /** The sticky box of the sticky carrier `id`, or `undefined`. */
    sticky: (id: number): RegisteredSticky | undefined => stickies.get(id),
    /** The carrier of a registered element, or the page. */
    carrierOf: (element: Element) =>
      elements.get(element)?.ownCarrier ?? PAGE_CARRIER,
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
     * Gives each registered element a tracker from `create`, now and as they
     * register, and destroys it when they leave. Calls `stuck` with the id
     * of a sticky box when it registers, sticks, lets go or leaves. Returns a
     * function that destroys every tracker, and stops.
     */
    track: (
      create: (element: Element) => ElementTracker,
      stuck?: (id: number) => void,
    ) => {
      createTracker = create;
      onStuck = stuck ?? null;
      for (const [element, use] of uses) {
        use.tracker = create(element);
      }
      return () => {
        createTracker = null;
        onStuck = null;
        for (const use of uses.values()) {
          use.tracker?.destroy();
          use.tracker = null;
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
     * Every tracked element with a box, as it was last measured, in page
     * coordinates at this scroll and with the viewport's bottom edge that
     * `readViewportBottom` reads, in registration order. Each one draws on
     * the `<canvas>` element of the carrier it was measured on. An Effect
     * cover is not one of them, and neither is an element that the box of a
     * cover overlaps and that is not inside that cover.
     */
    records: (
      scrollX: number,
      scrollY: number,
      readViewportBottom: () => number,
    ): MeasuredElement[] => {
      const records: MeasuredElement[] = [];
      const covers: { element: Element; box: ElementBox }[] = [];
      for (const [
        element,
        { id, roles, settings, scope, holds, covers: isCover, canvases },
      ] of elements) {
        const tracker = uses.get(element)?.tracker;
        const box = tracker?.boxAt(scrollX, scrollY, readViewportBottom);
        const canvas = tracker?.measured?.canvas;
        if (tracker == null || box == null || canvas === undefined) {
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
          measurement: tracker.measurement,
          roles,
          settings,
          scope,
          holds,
          canvas,
          canvases: canvases.includes(canvas)
            ? canvases
            : [...canvases, canvas],
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
