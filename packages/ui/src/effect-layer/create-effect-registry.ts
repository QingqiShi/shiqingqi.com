/**
 * One registered element. An element registered more than once, by nested
 * wrappers for example, is one entry with every role they add.
 *
 * @internal
 */
export interface RegisteredElement {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  /** One bit per role, as `EFFECT_ROLES` orders them. */
  readonly roles: number;
}

/**
 * The elements registered on one effect layer. React reads `getRoles`
 * through `useSyncExternalStore`; the effect layer reads `elements` each
 * frame.
 *
 * @internal
 */
export function createEffectRegistry() {
  const uses = new Map<
    Element,
    { id: number; registrations: Set<{ roles: number }> }
  >();
  const listeners = new Set<() => void>();
  let elements: ReadonlyMap<Element, RegisteredElement> = new Map();
  let roles = 0;
  let nextId = 1;

  function notify() {
    const next = new Map<Element, RegisteredElement>();
    roles = 0;
    for (const [element, { id, registrations }] of uses) {
      let elementRoles = 0;
      for (const registration of registrations) {
        elementRoles |= registration.roles;
      }
      next.set(element, { id, roles: elementRoles });
      roles |= elementRoles;
    }
    elements = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    /** Adds an element and returns the function that removes it again. */
    register: (element: Element, elementRoles: number) => {
      let use = uses.get(element);
      if (use === undefined) {
        use = { id: nextId++, registrations: new Set() };
        uses.set(element, use);
      }
      const { registrations } = use;
      const registration = { roles: elementRoles };
      registrations.add(registration);
      notify();
      return () => {
        registrations.delete(registration);
        if (
          registrations.size === 0 &&
          uses.get(element)?.registrations === registrations
        ) {
          uses.delete(element);
        }
        notify();
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
  };
}

/** @internal */
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;
