import { BookmarkIcon } from "@phosphor-icons/react/dist/ssr/Bookmark";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { IconButton } from "@tuja/ui/components/icon-button";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Both shapes, one variant. `plain` carries no surface, so at tile size it reads
 * as a loose dot rather than as a button — it belongs on the icon-button page,
 * next to the variants that give it context.
 */
export function IconButtonSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <IconButton
        variant="surface"
        icon={<HeartIcon weight="fill" />}
        aria-label={t({ en: "Like", zh: "喜欢" })}
      />
      <IconButton
        variant="surface"
        shape="square"
        icon={<BookmarkIcon />}
        aria-label={t({ en: "Save", zh: "收藏" })}
      />
    </div>
  );
}
