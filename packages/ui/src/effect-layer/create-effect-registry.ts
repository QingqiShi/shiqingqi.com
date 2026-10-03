import type { ElementTracker } from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import type { EffectElementRecord, EffectSettings } from "./types.ts";

/**
 * One registered element. An element registered more than once, by several
 * effect hooks for example, is one entry: its roles are every role the
 * registrations add, and each effect's settings come from the latest
 * registration that has them.
 *
 * @internal
 */
export interface RegisteredElement {
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
  /** Changes the roles and settings, and keeps the element's id. */
  update: (roles: number, settings: EffectSettings) => void;
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
  interface Registration {
    roles: number;
    settings: EffectSettings;
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
      for (const registration of registrations) {
        elementRoles |= registration.roles;
        settings =
          registrations.size === 1
            ? registration.settings
            : { ...settings, ...registration.settings };
      }
      next.set(element, { id, roles: elementRoles, settings });
      roles |= elementRoles;
    }
    elements = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    /** Adds an element and returns the registration that changes or removes it. */
    register: (
      element: Element,
      elementRoles: number,
      settings: EffectSettings,
    ): EffectRegistration => {
      const use = uses.get(element) ?? {
        id: nextId++,
        registrations: new Set(),
        tracker: createTracker?.(element) ?? null,
      };
      uses.set(element, use);
      const { registrations } = use;
      const registration: Registration = { roles: elementRoles, settings };
      registrations.add(registration);
      notify();
      return {
        update: (nextRoles, nextSettings) => {
          if (
            !registrations.has(registration) ||
            (registration.roles === nextRoles &&
              settingsEqual(registration.settings, nextSettings))
          ) {
            return;
          }
          registration.roles = nextRoles;
          registration.settings = nextSettings;
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
    records: (scrollX: number, scrollY: number): EffectElementRecord[] => {
      const inDocument: EffectElementRecord[] = [];
      const fixed: EffectElementRecord[] = [];
      for (const [element, { id, roles, settings }] of elements) {
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
        });
      }
      return [...inDocument, ...fixed];
    },
  };
}

/** @internal */
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;
