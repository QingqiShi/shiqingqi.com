import { use, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { EffectRegistration } from "./create-effect-registry.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import type { EffectSettings } from "./types.ts";

/**
 * The registration under every effect hook: a ref callback that registers
 * each element it is attached to with `roles` and `settings`. The ref stays
 * the same when the roles or the settings change; the registration takes
 * the new values, so the element keeps its id. Outside an
 * `EffectLayerProvider` the ref does nothing.
 *
 * @internal
 */
export function useEffectRegistration(roles: number, settings: EffectSettings) {
  const register = use(EffectLayerContext);
  const [registrations] = useState(() => new Set<EffectRegistration>());
  const currentRef = useRef({ roles, settings });

  useLayoutEffect(() => {
    currentRef.current = { roles, settings };
    for (const registration of registrations) {
      registration.update(roles, settings);
    }
  }, [registrations, roles, settings]);

  return useCallback(
    (element: Element | null): (() => void) | undefined => {
      if (element === null || register === null) {
        return undefined;
      }
      const current = currentRef.current;
      const registration = register(element, current.roles, current.settings);
      registrations.add(registration);
      return () => {
        registrations.delete(registration);
        registration.remove();
      };
    },
    [register, registrations],
  );
}
