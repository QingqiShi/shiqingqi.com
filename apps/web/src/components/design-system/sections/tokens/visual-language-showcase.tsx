import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { radius } from "@tuja/ui/primitives/radius.stylex";
import { texture } from "@tuja/ui/primitives/texture.stylex";
import { wash } from "@tuja/ui/primitives/wash.stylex";
import { border, color, font, measure, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

// Always Latin script regardless of locale — this specimen demonstrates
// measure.prose (33rem), which is measured in that script.
function latinSample() {
  return t({
    en: "A line of text asks the eye to jump back to the start of the next one every time it ends. The narrower the measure, the shorter that jump, and the less often the eye lands on a line it has already read. Around sixty-five Latin characters is where the jump stops being a risk — not because the number is special, but because a wider line does not make a sentence any easier to follow.",
    zh: "A line of text asks the eye to jump back to the start of the next one every time it ends. The narrower the measure, the shorter that jump, and the less often the eye lands on a line it has already read. Around sixty-five Latin characters is where the jump stops being a risk — not because the number is special, but because a wider line does not make a sentence any easier to follow.",
  });
}

// Always Han script regardless of locale — this specimen demonstrates
// measure.proseHan (41rem), which is measured in that script.
function hanSample() {
  return t({
    en: "每读完一行，眼睛都要跳回下一行的开头。行越窄，这一跳就越短，也就越少落在已经读过的行上。四十一个汉字左右，是这一跳还不算冒险的地方——不是因为这个数字特殊，而是因为更宽的行并不会让句子更容易读懂。",
    zh: "每读完一行，眼睛都要跳回下一行的开头。行越窄，这一跳就越短，也就越少落在已经读过的行上。四十一个汉字左右，是这一跳还不算冒险的地方——不是因为这个数字特殊，而是因为更宽的行并不会让句子更容易读懂。",
  });
}

export function VisualLanguageShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Surfaces", zh: "表面" })}>
        <ShowcaseHelper>
          {t({
            en: "A surface separates itself with a border, a background colour, or both. Use the least that does the job.",
            zh: "表面靠描边、背景色或两者共同与周围区分——采用能达到目的的最少手段即可。",
          })}
        </ShowcaseHelper>
        <div css={styles.surfaceGrid}>
          <div css={styles.surfaceItem}>
            <div css={[styles.surfaceSwatch, styles.borderOnly]} />
            <Text variant="bodySmall" weight="semibold">
              {t({ en: "Border only", zh: "仅描边" })}
            </Text>
            <Text variant="caption" tone="muted">
              {t({
                en: "An input field: found by its edge, not by a fill.",
                zh: "输入框：靠边缘即可找到，不需要额外的底色。",
              })}
            </Text>
          </div>
          <div css={styles.surfaceItem}>
            <div css={[styles.surfaceSwatch, styles.backgroundOnly]} />
            <Text variant="bodySmall" weight="semibold">
              {t({ en: "Background only", zh: "仅背景色" })}
            </Text>
            <Text variant="caption" tone="muted">
              {t({
                en: "A selected row: it only has to stand out from its siblings.",
                zh: "选中行：只需要与同类区分开来。",
              })}
            </Text>
          </div>
          <div css={styles.surfaceItem}>
            <div css={[styles.surfaceSwatch, cardSurface.base]} />
            <Text variant="bodySmall" weight="semibold">
              {t({ en: "Both", zh: "两者兼具" })}
            </Text>
            <Text variant="caption" tone="muted">
              {t({
                en: "A card: it holds content of its own, so it takes both.",
                zh: "卡片：承载着自己的内容，因此两者都要。",
              })}
            </Text>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Radius nesting", zh: "圆角嵌套" })}>
        <ShowcaseHelper>
          {t({
            en: "A radius inside a radius is reduced by the inset between them: inner = outer − inset. Equal radii instead, and the gap between the two curves pinches at the corner.",
            zh: "内嵌于另一表面圆角处的表面，其圆角要按二者间距做减法：内 = 外 − 间距。若两者圆角相同，拐角处的间距会被压缩，读起来像是收紧了一处。",
          })}
        </ShowcaseHelper>
        <div css={styles.radiusGrid}>
          <div css={styles.radiusItem}>
            <div css={styles.radiusOuter}>
              <div
                css={[
                  styles.radiusInner,
                  radius.inside(border.radius_3, space._1),
                ]}
              />
            </div>
            <Text variant="bodySmall" weight="semibold">
              radius.inside(outer, inset)
            </Text>
            <Text variant="caption" tone="muted">
              {t({ en: "Corners stay parallel.", zh: "圆角保持同心。" })}
            </Text>
          </div>
          <div css={styles.radiusItem}>
            <div css={styles.radiusOuter}>
              <div css={[styles.radiusInner, styles.radiusEqual]} />
            </div>
            <Text variant="bodySmall" weight="semibold">
              {t({ en: "Equal radii", zh: "圆角相同" })}
            </Text>
            <Text variant="caption" tone="muted">
              {t({ en: "The corner pinches.", zh: "拐角处被压缩。" })}
            </Text>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Measure", zh: "行长" })}>
        <ShowcaseHelper>
          {t({
            en: "measure.prose caps a Latin paragraph at 33rem, around 65 characters; measure.proseHan caps a Han paragraph at 41rem, around 41 characters. The two do not agree — 65 Latin characters and 41 han characters are different lengths, so one cap cannot serve both scripts.",
            zh: "measure.prose 把拉丁文段落的行长上限设在 33rem，约 65 个字符；measure.proseHan 把汉字段落的上限设在 41rem，约 41 个字符。二者并不一致——65 个拉丁字符与 41 个汉字并非同一长度，一个上限无法同时适用于两种文字。",
          })}
        </ShowcaseHelper>
        <div css={styles.measureCompare}>
          <div css={styles.measureColumn}>
            <span css={styles.measureTag}>measure.prose · 33rem</span>
            <p css={[styles.measureParagraph, styles.measureCappedProse]}>
              {latinSample()}
            </p>
          </div>
          <div css={styles.measureColumn}>
            <span css={styles.measureTag}>
              {t({ en: "uncapped", zh: "未设上限" })}
            </span>
            <p css={styles.measureParagraph}>{latinSample()}</p>
          </div>
        </div>
        <div css={styles.measureColumn}>
          <span css={styles.measureTag}>measure.proseHan · 41rem</span>
          <p css={[styles.measureParagraph, styles.measureCappedHan]}>
            {hanSample()}
          </p>
        </div>
        <ShowcaseHelper>
          {t({
            en: "This page's own body copy still caps at a single, shared 41rem figure (Foundations → Layout → Measure) — the compromise these two script-aware tokens are here to replace, one script at a time.",
            zh: "本页正文目前仍沿用整个站点共用的单一 41rem 上限（见 基础 → 布局 → 行长）——这正是这两个按脚本区分的新令牌要逐步取代的折中方案。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Texture", zh: "纹理" })}>
        <ShowcaseHelper>
          {t({
            en: "A texture is one mark at one size — a line or a dot, never both — kept faint enough that it never resolves into a pattern with a name. The mark's size and spacing are set per surface: a gap tuned for a full page reads as noise on a small card.",
            zh: "纹理只用一种标记、一种尺寸——线或点，二者不可兼得——并且要足够淡，不能让人读出一种有名字的图案。标记的尺寸与间距按表面各自调整：为整页调好的间距，放到小卡片上就会读成噪点。",
          })}
        </ShowcaseHelper>
        <div css={styles.textureLargeRow}>
          <div css={[styles.textureLarge, texture.lines("28px")]}>
            <span css={styles.textureLabel}>
              {'texture.lines("28px") · '}
              {t({ en: "large surface", zh: "大表面" })}
            </span>
          </div>
        </div>
        <div css={styles.textureGrid}>
          <div css={styles.textureItem}>
            <div css={[styles.textureCard, texture.lines("28px")]} />
            <Text variant="caption" tone="muted">
              {t({
                en: "Same 28px gap on a small card — reads as noise.",
                zh: "小卡片上用同样 28px 的间距——读成了噪点。",
              })}
            </Text>
          </div>
          <div css={styles.textureItem}>
            <div css={[styles.textureCard, texture.lines("6px")]} />
            <Text variant="caption" tone="muted">
              {t({
                en: "6px gap, tuned for a small card.",
                zh: "6px 间距，为小卡片调校。",
              })}
            </Text>
          </div>
        </div>
        <div css={styles.textureLargeRow}>
          <div css={[styles.textureLarge, texture.dots("40px")]}>
            <span css={styles.textureLabel}>
              {'texture.dots("40px") · '}
              {t({ en: "large surface", zh: "大表面" })}
            </span>
          </div>
        </div>
        <div css={styles.textureGrid}>
          <div css={styles.textureItem}>
            <div css={[styles.textureCard, texture.dots("40px")]} />
            <Text variant="caption" tone="muted">
              {t({
                en: "Same 40px gap on a small card — reads as noise.",
                zh: "小卡片上用同样 40px 的间距——读成了噪点。",
              })}
            </Text>
          </div>
          <div css={styles.textureItem}>
            <div css={[styles.textureCard, texture.dots("10px")]} />
            <Text variant="caption" tone="muted">
              {t({
                en: "10px gap, tuned for a small card.",
                zh: "10px 间距，为小卡片调校。",
              })}
            </Text>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Wash", zh: "淡彩" })}>
        <ShowcaseHelper>
          {t({
            en: "A wash is a broad gradient that gives a surface some volume — one tone drifting across it, with no bright spot anywhere. A bright spot would read as a light source.",
            zh: "淡彩是横跨表面的一段渐变，让表面显出一点体量——一种色调缓缓流过，不带任何亮点。亮点会被读成光源。",
          })}
        </ShowcaseHelper>
        <div css={styles.washGrid}>
          <div css={styles.washItem}>
            <div css={[styles.washSwatch, wash.none]} />
            <Text variant="caption" tone="muted">
              wash.none
            </Text>
          </div>
          <div css={styles.washItem}>
            <div css={[styles.washSwatch, wash.neutral("165deg")]} />
            <Text variant="caption" tone="muted">
              {'wash.neutral("165deg")'}
            </Text>
          </div>
          <div css={styles.washItem}>
            <div css={[styles.washSwatch, wash.accent("165deg")]} />
            <Text variant="caption" tone="muted">
              {'wash.accent("165deg")'}
            </Text>
          </div>
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  surfaceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: space._4,
  },
  surfaceItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  surfaceSwatch: {
    blockSize: "96px",
    borderRadius: border.radius_3,
  },
  borderOnly: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: "transparent",
  },
  backgroundOnly: {
    backgroundColor: color.bgInteractiveSelected,
  },
  radiusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: space._4,
  },
  radiusItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  radiusOuter: {
    padding: space._1,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  radiusInner: {
    blockSize: "96px",
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  // Same fixed radius as the outer surface — the mismatch the specimen exists
  // to show, next to the correctly-inset one above.
  radiusEqual: {
    borderRadius: border.radius_3,
  },
  measureCompare: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: space._4,
  },
  measureColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    flex: "1 1 260px",
    minInlineSize: 0,
  },
  measureTag: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  measureParagraph: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMain,
    lineHeight: font.lineHeight_4,
    textWrap: "pretty",
  },
  measureCappedProse: {
    maxInlineSize: measure.prose,
  },
  measureCappedHan: {
    maxInlineSize: measure.proseHan,
  },
  textureLargeRow: {
    display: "flex",
  },
  textureLarge: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "120px",
    display: "flex",
    alignItems: "flex-end",
    padding: space._2,
    borderRadius: border.radius_3,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  textureLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  textureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: space._3,
  },
  textureItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  textureCard: {
    blockSize: "88px",
    borderRadius: border.radius_2,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  washGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: space._3,
  },
  washItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  washSwatch: {
    blockSize: "120px",
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
});
