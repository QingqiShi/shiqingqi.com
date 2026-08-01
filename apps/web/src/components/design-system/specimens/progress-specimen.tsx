import { Progress } from "@tuja/ui/components/progress";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * One bar, part-filled, at the thickest size — at thumbnail scale a thin track
 * would read as a `Divider`, and the split between fill and remainder is the
 * only thing that says "progress".
 */
export function ProgressSpecimen() {
  return (
    <div css={specimenLayout.fill}>
      <Progress
        value={62}
        size="lg"
        label={t({ en: "Upload progress", zh: "上传进度" })}
      />
    </div>
  );
}
