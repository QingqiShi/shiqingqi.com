import type { ElementTracker } from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type { EffectSettings, MeasuredElement } from "./types.ts";

/**
 * Where a registration puts its element: the scope it is in, and the scope
 * it holds as an Effect container, or `null`.
 *
 * @internal
 */
export interface EffectPlacement {
  readonly scope: number;
  readonly holds: number | null;
}

/**
 * One registered element. An element registered more than once, by several
 * effect hooks for example, is one entry: its roles are every role the
 * registrations add, each effect's settings come from the latest
 * registration that has them, its scope from the latest registration, and
 * the scope it holds from the latest registration that holds one.
 *
 * @internal
 */
export interface RegisteredElement extends EffectPlacement {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  /** One bit per role, as `EFFECT_ROLES` orders them. */
  readonly roles: number;
  readonly settings: EffectSettings;
}

/**
 * One registration of an element, which an effect hook keeps while its ref
 * stays attached.
 *
 * @internal
 */
export interface EffectRegistration {
  /** Changes the roles, the settings and the scope, and keeps the element's id. */
  update: (roles: number, settings: EffectSettings, scope: number) => void;
  remove: () => void;
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
  }
  const uses = new Map<
    Element,
    {
      id: number;
      registrations: Set<Registration>;
      tracker: ElementTracker | null;
    }
  >();
  let createTracker: ((element: Element) => ElementTracker) | null = null;
  const listeners = new Set<() => void>();
  let elements: ReadonlyMap<Element, RegisteredElement> = new Map();
  let roles = 0;
  let nextId = 1;

  function notify() {
    const next = new Map<Element, RegisteredElement>();
    roles = 0;
    for (const [element, { id, registrations }] of uses) {
      let elementRoles = 0;
      let settings = NO_SETTINGS;
      let scope = PAGE_SCOPE;
      let holds: number | null = null;
      for (const registration of registrations) {
        elementRoles |= registration.roles;
        scope = registration.scope;
        holds = registration.holds ?? holds;
        settings =
          registrations.size === 1
            ? registration.settings
            : { ...settings, ...registration.settings };
      }
      next.set(element, { id, roles: elementRoles, settings, scope, holds });
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
     * it. `placement` gives the scope the element is in, and the scope it
     * holds when it is an Effect container.
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
        roles: elementRoles,
        settings,
      };
      registrations.add(registration);
      notify();
      return {
        update: (nextRoles, nextSettings, nextScope) => {
          if (
            !registrations.has(registration) ||
            (registration.roles === nextRoles &&
              registration.scope === nextScope &&
              settingsEqual(registration.settings, nextSettings))
          ) {
            return;
          }
          registration.roles = nextRoles;
          registration.settings = nextSettings;
          registration.scope = nextScope;
          notify();
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
     * Gives each registered element a tracker from `create`, now and as
     * elements register, and destroys it when its element leaves. Returns a
     * function that destroys every tracker and stops.
     */
    track: (create: (element: Element) => ElementTracker) => {
      createTracker = create;
      for (const [element, use] of uses) {
        use.tracker = create(element);
      }
      return () => {
        createTracker = null;
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
     * coordinates at this scroll: those in the document first, then the
     * fixed ones, each group in registration order.
     */
    records: (scrollX: number, scrollY: number): MeasuredElement[] => {
      const inDocument: MeasuredElement[] = [];
      const fixed: MeasuredElement[] = [];
      for (const [element, { id, roles, settings, scope, holds }] of elements) {
        const box = uses.get(element)?.tracker?.boxAt(scrollX, scrollY);
        if (box == null) {
          continue;
        }
        (box.fixed ? fixed : inDocument).push({
          ...box,
          id,
          element,
          roles,
          settings,
          scope,
          holds,
        });
      }
      return [...inDocument, ...fixed];
    },
  };
}

/** @internal */
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;
