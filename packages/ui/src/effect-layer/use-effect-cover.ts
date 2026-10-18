import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

interface EffectCoverOptions {
  /**
   * The cover locks the page under it, as a sheet or a modal dialog does.
   * While it has a box, the effect layer also takes away the `<canvas>`
   * elements of the page and of each Scroll region outside every modal
   * cover, to free their memory. Their elements keep their state, and their
   * effects show again when the cover goes.
   *
   * @default false
   */
  readonly modal?: boolean;
}

/**
 * Makes an element an Effect cover: attach the returned ref to an element
 * that shows over the page, such as a sheet, a menu or a dialog. While the
 * element has a box, the effect layer draws nothing for each registered
 * element that the box overlaps and that is not inside the element, so that
 * no effect shows over it. The layer measures the box like that of an
 * Effect boundary, so a cover with `opacity: 0` or `visibility: hidden` has
 * no box and hides nothing. Use `{ modal: true }` for a cover that locks the
 * page. Outside an `EffectLayerProvider` the ref does nothing.
 */
export function useEffectCover({ modal = false }: EffectCoverOptions = {}) {
  return useEffectRegistration(0, NO_SETTINGS, null, true, modal);
}
