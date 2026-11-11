import { t } from "@tuja/i18n";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Switch } from "@tuja/ui/components/switch";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/**
 * One row with its switch: two rows are taller than the plate at the
 * narrowest tile. The switch is controlled with no `onChange`, which is safe
 * because the tile is inert.
 */
export function SettingRowSpecimen() {
  return (
    <SettingList css={fill.inline}>
      <SettingRow
        label={t({ en: "Morning report", zh: "晨间报告" })}
        control={<Switch value="on" />}
      />
    </SettingList>
  );
}
