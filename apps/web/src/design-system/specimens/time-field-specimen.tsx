import { t } from "@tuja/i18n";
import { TimeField } from "@tuja/ui/components/time-field";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/** A labelled time of day, the field's everyday shape. */
export function TimeFieldSpecimen() {
  return (
    <TimeField
      size="sm"
      label={t({ en: "Departs", zh: "出发" })}
      defaultValue="09:30"
      css={fill.inline}
    />
  );
}
