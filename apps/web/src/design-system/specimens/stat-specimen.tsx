import { t } from "@tuja/i18n";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/**
 * One stat on its card. At the narrowest tile a group stacks its stats, and
 * two cards are taller than the plate.
 */
export function StatSpecimen() {
  return (
    <StatGroup css={fill.inline}>
      <Stat label={t({ en: "Spent", zh: "支出" })} value="£2,184" />
    </StatGroup>
  );
}
