import { createContext, use } from "react";

/**
 * The ids that a `SettingRow` gives the control at its end: the control's id,
 * which the row's `<label>` points at, and the id of the row's description.
 *
 * @internal
 */
export interface SettingRowControl {
  id: string;
  descriptionId: string | undefined;
}

/** @internal */
export const SettingRowContext = createContext<SettingRowControl | null>(null);

/**
 * The ids of the `SettingRow` around a control without a label of its own, for
 * `useFieldAria`, or `null` where the control has a label or sits outside a
 * row's `control` slot. Only a control that can fill that slot calls it, so a
 * field outside it, such as `TextField`, does not need the client.
 *
 * @internal
 */
export function useSettingRowControl(unlabelled: boolean) {
  const row = use(SettingRowContext);
  return unlabelled ? row : null;
}
