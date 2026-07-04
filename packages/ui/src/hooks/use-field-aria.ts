import { useId, type AriaAttributes } from "react";

interface UseFieldAriaOptions {
  /**
   * Caller-supplied id for the control. Falls back to a generated one; the
   * description/error ids are derived from whichever wins so they stay unique
   * and stable across renders.
   */
  id?: string;
  /** A caller-provided `aria-describedby`, merged ahead of the field's own ids. */
  ariaDescribedBy?: string;
  /** A caller-provided `aria-invalid`; an active error always forces `true`. */
  ariaInvalid?: AriaAttributes["aria-invalid"];
  /** Description text, if any. Empty strings count as absent. */
  description?: string;
  /** Error text, if any. Empty strings count as absent. */
  error?: string;
}

/**
 * Single source of truth for the label/description/error wiring shared by every
 * form field (`TextField`, `Textarea`, `Checkbox`, `Select`). Deriving the ids,
 * `aria-describedby`, and `aria-invalid` in one place keeps the accessibility
 * contract identical across controls instead of drifting per copy-paste.
 *
 * Empty-string `description`/`error` are treated as absent so a control never
 * points `aria-describedby` at an empty node.
 */
export function useFieldAria({
  id,
  ariaDescribedBy,
  ariaInvalid,
  description,
  error,
}: UseFieldAriaOptions) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  const hasDescription = description !== undefined && description !== "";
  const hasError = error !== undefined && error !== "";

  const describedBy =
    [
      ariaDescribedBy,
      hasDescription ? descriptionId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: hasError ? true : ariaInvalid,
  };
}
