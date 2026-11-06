import { createContext } from "react";

/**
 * The props of the trigger of the `TableDisclosure` around it.
 *
 * @internal
 */
export interface TableDisclosureTriggerProps {
  type: "button";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
}

/** @internal */
export const TableDisclosureContext =
  createContext<TableDisclosureTriggerProps | null>(null);
