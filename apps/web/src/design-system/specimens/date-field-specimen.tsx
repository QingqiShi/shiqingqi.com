import { t } from "@tuja/i18n";
import { DateField } from "@tuja/ui/components/date-field";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/** A labelled day, the field's everyday shape. */
export function DateFieldSpecimen() {
  return (
    <DateField
      size="sm"
      label={t({ en: "Check-in", zh: "入住" })}
      defaultValue="2026-05-14"
      css={fill.inline}
    />
  );
}
