import { createContext } from "react";

/**
 * Tells the sheet that the person changed a thing in its form. A control
 * that sends no `input` or `change` event of the browser calls it; the
 * sheet hears those events itself.
 */
export const SheetInputContext = createContext<() => void>(() => undefined);
