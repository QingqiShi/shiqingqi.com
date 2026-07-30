import { Button } from "@tuja/ui/components/button";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * The primary/secondary pair, which is how buttons almost always appear. No
 * leading icon: the tile is naming the control, and an icon is one more shape to
 * read before the shape that matters.
 */
export function ButtonSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <Button variant="primary">{t({ en: "Continue", zh: "继续" })}</Button>
      <Button>{t({ en: "Cancel", zh: "取消" })}</Button>
    </div>
  );
}
