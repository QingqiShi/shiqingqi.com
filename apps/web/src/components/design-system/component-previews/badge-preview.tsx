import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * One semantic tone and one neutral. Fanning out all seven would put four hues
 * in a single tile and turn the grid into a swatch chart; the pair reads as a
 * family, and the badge page is where the full set belongs.
 */
export function BadgePreview() {
  return (
    <div css={previewLayout.row}>
      <Badge variant="success" icon={<CheckIcon weight="bold" />}>
        {t({ en: "Verified", zh: "已验证" })}
      </Badge>
      <Badge variant="neutral">{t({ en: "Draft", zh: "草稿" })}</Badge>
    </div>
  );
}
