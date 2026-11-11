import { t } from "@tuja/i18n";
import { Slider } from "@tuja/ui/components/slider";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/**
 * A labelled panel part way along its groove: the whole shape of the control
 * at thumbnail size, with the plain value at the end of the groove.
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
      css={fill.inline}
    />
  );
}
