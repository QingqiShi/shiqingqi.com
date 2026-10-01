import { Slider } from "@tuja/ui/components/slider";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * A label above a part-filled track with its thumb in view — the whole shape of
 * the control at thumbnail size. No readout: a figure would have to be formatted
 * for the reader's locale, and the plate is inert, so it could never follow the
 * thumb anyway.
 *
 * Uncontrolled, because the types require an `onChange` beside a `value` and an
 * inert specimen has no use for one.
 */
export function SliderSpecimen() {
  return (
    <Slider
      size="sm"
      label={t({ en: "Budget", zh: "预算" })}
      defaultValue={62}
      css={specimenLayout.fill}
    />
  );
}
