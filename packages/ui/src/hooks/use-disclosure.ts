import { useCallback, useId } from "react";
import { useControlled } from "./use-controlled.ts";

interface DisclosureOptions {
  /** Controlled open state. Omit to let the hook own it. */
  open?: boolean;
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Called with the next state whenever the trigger toggles. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Id for the panel, used to wire `aria-controls`. Defaults to a generated one
   * — pass your own only when the panel element already has an id.
   */
  panelId?: string;
}

interface DisclosureTriggerProps {
  type: "button";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
}

interface DisclosurePanelProps {
  id: string;
  hidden: boolean;
}

/**
 * Headless expand/collapse state with the ARIA wiring that makes a disclosure a
 * disclosure: `aria-expanded` on the trigger, `aria-controls` pointing at the
 * panel, and `hidden` on the panel while it is collapsed.
 *
 * This is the custom layer beneath the `Disclosure` component. Reach for it when
 * the trigger cannot be the whole header — a row that also holds a link, for
 * instance, where wrapping everything in one `<button>` would nest interactive
 * elements. Spread `triggerProps` onto the control and `panelProps` onto the
 * region it reveals.
 *
 * Keep the panel element mounted so `aria-controls` always resolves; render its
 * *contents* conditionally when they are expensive (an iframe, a chart).
 *
 * @param open Controlled open state; omit for uncontrolled.
 * @param defaultOpen Initial state when uncontrolled.
 * @param onOpenChange Notified with the next state on every toggle, controlled
 * or not.
 * @param panelId Overrides the generated panel id.
 * @returns `{ open, toggle, setOpen, triggerProps, panelProps }`.
 */
export function useDisclosure({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  panelId,
}: DisclosureOptions = {}) {
  const generatedId = useId();
  const resolvedPanelId = panelId ?? generatedId;
  const [open, setInternalOpen] = useControlled({
    controlled,
    defaultValue: defaultOpen,
  });

  // `useControlled`'s setter is a no-op while controlled, so the callback is
  // what tells a controlling parent to update — it fires either way.
  const setOpen = useCallback(
    (next: boolean) => {
      setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, setInternalOpen],
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const triggerProps: DisclosureTriggerProps = {
    type: "button",
    "aria-expanded": open,
    "aria-controls": resolvedPanelId,
    onClick: toggle,
  };

  const panelProps: DisclosurePanelProps = {
    id: resolvedPanelId,
    hidden: !open,
  };

  return { open, toggle, setOpen, triggerProps, panelProps };
}
