import { Textarea } from "@tuja/ui/components/textarea";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/** A two-row textarea carrying a value, so the multi-line shape is obvious. */
export function TextareaPreview() {
  return (
    <Textarea
      size="sm"
      rows={2}
      label={t({ en: "Review", zh: "评论" })}
      defaultValue={t({
        en: "Beautifully shot, and it earns its runtime.",
        zh: "镜头极美，片长也用得其所。",
      })}
      css={previewLayout.fill}
    />
  );
}
