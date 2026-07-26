import { BookmarkIcon } from "@phosphor-icons/react/dist/ssr/Bookmark";
import { Chip } from "@tuja/ui/components/chip";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * Selected and unselected, since the whole point of a chip over a badge is that
 * it has states. Both render the button form: the link form looks identical at
 * rest, and an anchor inside an inert tray would only advertise a destination
 * the tile can't take you to.
 */
export function ChipPreview() {
  return (
    <div css={previewLayout.row}>
      <Chip isActive>{t({ en: "Now playing", zh: "正在上映" })}</Chip>
      <Chip icon={<BookmarkIcon weight="bold" />}>
        {t({ en: "Watchlist", zh: "待看清单" })}
      </Chip>
    </div>
  );
}
