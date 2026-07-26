import { Checkbox } from "@tuja/ui/components/checkbox";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * Checked and empty — the pair that reads as a group at a glance. The
 * indeterminate box is a third state that needs its siblings visible to make
 * sense, so it belongs on the checkbox page rather than in a two-row sample.
 *
 * `defaultChecked` keeps the native input uncontrolled, so React never asks for
 * the `onChange` an inert specimen has no use for.
 */
export function CheckboxPreview() {
  return (
    <div css={previewLayout.stack}>
      <Checkbox
        size="sm"
        defaultChecked
        label={t({ en: "Now playing", zh: "正在上映" })}
      />
      <Checkbox size="sm" label={t({ en: "Upcoming", zh: "即将上映" })} />
    </div>
  );
}
