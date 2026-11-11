import { t } from "@tuja/i18n";
import { Textarea } from "@tuja/ui/components/textarea";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/** A two-row textarea carrying a value, so the multi-line shape is obvious. */
export function TextareaSpecimen() {
  return (
    <Textarea
      size="sm"
      rows={2}
      label={t({ en: "Review", zh: "评论" })}
      defaultValue={t({
        en: "Beautifully shot, and it earns its runtime.",
        zh: "镜头极美，片长也用得其所。",
      })}
      controlCss={fill.inline}
    />
  );
}
