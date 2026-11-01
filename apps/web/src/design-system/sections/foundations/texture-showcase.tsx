import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const STYLES = `import * as stylex from "@stylexjs/stylex";
import { textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  grain: { [textureTokens.pitch]: space._0 },
});`;

export function TextureShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Give a still surface grain with Texture.",
        zh: "用纹理给静止的表面添一层颗粒。",
      })}
      lead={t({
        en: "A Texture repeats one tiny dot on a square grid. Set how far apart the dots sit, and their colour.",
        zh: "纹理在方形网格上重复一个极小的点。点与点的间距和点的颜色，都由你设定。",
      })}
    >
      <Specimen token="texture.dot">
        <Card css={[texture.dot, styles.grain]}>
          {t({ en: "Three days in Kyoto", zh: "京都三日" })}
        </Card>
      </Specimen>
      <UsageSnippet label={t({ en: "Styles", zh: "样式" })} code={STYLES} />
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "textureTokens.ink sets the colour. Below a pitch of space._0, the dots blur.",
            zh: "textureTokens.ink 设定颜色。间距小于 space._0 时，点会变糊。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Never nest one Texture in another: neither reads as its own surface.",
            zh: "不要把纹理套进另一层纹理：哪一层都不再像它自己的表面。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "A Wash and a Texture both paint the background: put the Wash outside.",
            zh: "淡彩与纹理都绘制背景：把淡彩放在外层。",
          })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  grain: { [textureTokens.pitch]: space._0 },
});
