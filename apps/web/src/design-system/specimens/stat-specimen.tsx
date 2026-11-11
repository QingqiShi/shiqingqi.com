import { t } from "@tuja/i18n";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/** Two stats on cards, the second with an Intent, so the row reads as figures that mean something. */
export function StatSpecimen() {
  return (
    <StatGroup css={fill.inline}>
      <Stat label={t({ en: "Spent", zh: "支出" })} value="£2,184" />
      <Stat
        label={t({ en: "Net", zh: "净额" })}
        value="+£2,066"
        intent="success"
      />
    </StatGroup>
  );
}
