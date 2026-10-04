import { use, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { EffectRegistration } from "./create-effect-registry.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { EffectScopeContext } from "./effect-scope-context.ts";
import type { EffectSettings } from "./types.ts";

/**
 * The registration under every effect hook: a ref callback that registers
 * each element it is attached to with `roles` and `settings`, in the scope
 * of the nearest `EffectContainer` above the hook. The ref stays the same
 * when the roles, the settings or the scope change; the registration takes
 * the new values, so the element keeps its id. With `holds`, each element
 * is an Effect container that holds that scope. Outside an
 * `EffectLayerProvider` the ref does nothing.
 *
 * @internal
 */
export function useEffectRegistration(
  roles: number,
  settings: EffectSettings,
  holds: number | null = null,
) {
  const register = use(EffectLayerContext);
  const scope = use(EffectScopeContext);
  const [registrations] = useState(() => new Set<EffectRegistration>());
  const currentRef = useRef({ roles, settings, scope });

  useLayoutEffect(() => {
    currentRef.current = { roles, settings, scope };
    for (const registration of registrations) {
      registration.update(roles, settings, scope);
    }
  }, [registrations, roles, settings, scope]);

  return useCallback(
    (element: Element | null): (() => void) | undefined => {
      if (element === null || register === null) {
        return undefined;
      }
      const current = currentRef.current;
      const registration = register(element, current.roles, current.settings, {
        scope: current.scope,
        holds,
      });
      registrations.add(registration);
      return () => {
        registrations.delete(registration);
        registration.remove();
      };
    },
    [register, registrations, holds],
  );
}
