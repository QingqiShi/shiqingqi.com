import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { glassSurface } from "@tuja/ui/components/glass-surface.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const STYLES = `import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  page: { position: "relative", textAlign: "center" },
  glass: { position: "absolute", insetInline: 0, insetBlockEnd: 0, blockSize: "50%" },
});`;

export function GlassShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Put what floats on Glass.",
        zh: "浮起的表面，用玻璃。",
      })}
      lead={t({
        en: "Glass blurs what lies beneath a floating surface, so people see where they are without the detail. Toast and TabBar already use it.",
        zh: "玻璃把浮动表面下方的内容虚化，用户看得出自己在哪里，又不被细节分心。Toast 与 TabBar 已经用上了它。",
      })}
    >
      <Example>
        <div css={styles.page}>
          <p css={typeRole.display}>
            {t({
              en: "The page goes on under the glass.",
              zh: "页面在玻璃下面继续延伸。",
            })}
          </p>
          <div css={[glassSurface.base, corner.radius_4, styles.glass]} />
        </div>
      </Example>
      <UsageSnippet label={t({ en: "Styles", zh: "样式" })} code={STYLES} />
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "Give the glass a position, or its rim covers the nearest positioned ancestor.",
            zh: "给玻璃设置定位，否则它的边缘会盖住最近的已定位祖先元素。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Tune it through glassTokens, not a later background, blur or shadow.",
            zh: "通过 glassTokens 调整它，不要在后面另写背景、模糊或阴影。",
          })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  page: { position: "relative", textAlign: "center" },
  glass: {
    position: "absolute",
    insetInline: 0,
    insetBlockEnd: 0,
    blockSize: "50%",
  },
});
