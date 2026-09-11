import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two of the six Intents. Fanning out all seven intents would put four hues
 * in a single tile and turn the grid into a swatch chart; the pair reads as a
 * family, and the badge page is where the full set belongs.
 */
export function BadgeSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <Badge intent="success" icon={<CheckIcon weight="bold" />}>
        {t({ en: "Verified", zh: "已验证" })}
      </Badge>
      <Badge intent="neutral">{t({ en: "Draft", zh: "草稿" })}</Badge>
    </div>
  );
}
