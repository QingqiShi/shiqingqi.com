import { t } from "@tuja/i18n";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Switch } from "@tuja/ui/components/switch";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two rows with a switch each and the divider between them. The switches are
 * controlled with no `onChange`, which is safe because the tile is inert.
 */
export function SettingRowSpecimen() {
  return (
    <SettingList css={specimenLayout.fill}>
      <SettingRow
        label={t({ en: "Morning report", zh: "晨间报告" })}
        control={<Switch value="on" />}
      />
      <SettingRow
        label={t({ en: "File receipts", zh: "归档收据" })}
        control={<Switch value="off" />}
      />
    </SettingList>
  );
}
