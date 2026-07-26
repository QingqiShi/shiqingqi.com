import { Callout } from "@tuja/ui/components/callout";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * One callout at full tile width, in the component's default variant — the
 * shape it takes in a real page, sized to its content rather than stretched to
 * fill a panel.
 */
export function CalloutPreview() {
  return (
    <Callout
      title={t({ en: "Region locked", zh: "地区限制" })}
      css={previewLayout.fill}
    >
      {t({ en: "Not streaming in the UK.", zh: "英国地区暂无流媒体。" })}
    </Callout>
  );
}
