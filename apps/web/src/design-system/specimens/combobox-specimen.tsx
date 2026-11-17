import { t } from "@tuja/i18n";
import { Combobox } from "@tuja/ui/components/combobox";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/** A picked time zone, the field's everyday shape. */
export function ComboboxSpecimen() {
  return (
    <Combobox
      size="sm"
      label={t({ en: "Time zone", zh: "时区" })}
      options={[
        { id: "Europe/Lisbon", label: "Lisbon", detail: "Europe/Lisbon" },
      ]}
      defaultSelected="Europe/Lisbon"
      css={fill.inline}
    />
  );
}
