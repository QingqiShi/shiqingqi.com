import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function BordersShowcase() {
  // Each swatch is drawn at the token's true value — the ring thickens and the
  // corner rounds live if an author edits the token. Style refs live beside
  // their token so the specimen and its label can't drift apart.
  const widths = [
    { token: "border.size_1", px: "1px", swatch: styles.w1 },
    { token: "border.size_2", px: "2px", swatch: styles.w2 },
    { token: "border.size_3", px: "5px", swatch: styles.w3 },
    { token: "border.size_4", px: "10px", swatch: styles.w4 },
    { token: "border.size_5", px: "25px", swatch: styles.w5 },
  ];
  const radii = [
    { token: "border.radius_1", meta: "0.3rem", swatch: styles.r1 },
    { token: "border.radius_2", meta: "0.5rem", swatch: styles.r2 },
    { token: "border.radius_3", meta: "1rem", swatch: styles.r3 },
    { token: "border.radius_4", meta: "2rem", swatch: styles.r4 },
    { token: "border.radius_5", meta: "3rem", swatch: styles.r5 },
    { token: "border.radius_round", meta: "pill", swatch: styles.rRound },
  ];

  return (
    <>
      <Showcase label={t({ en: "Border width", zh: "描边粗细" })}>
        <ShowcaseHelper>
          {t({
            en: "Five rule thicknesses, drawn as real borders at true size. size_1 is the hairline used on nearly every surface; the heavier steps are reserved for emphasis and dividers.",
            zh: "五种线宽，皆以真实尺寸的描边呈现。size_1 是几乎每个表面都在用的发丝线；更粗的步长留给强调与分隔。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {widths.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.px}>
              <div css={[styles.widthSwatch, step.swatch]} />
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Corner radius", zh: "圆角" })}>
        <ShowcaseHelper>
          {t({
            en: "Five fixed radii plus radius_round, each drawn to its true curve. radius_round resolves to a very large length, so it clamps to a full pill or circle on any box.",
            zh: "五种固定圆角外加 radius_round，皆按真实弧度绘制。radius_round 解析为极大的长度值，因此在任意方框上都会收敛为完整的胶囊或圆形。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {radii.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.meta}>
              <div css={[styles.radiusSwatch, step.swatch]} />
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "When to use", zh: "何时使用" })}>
        <ShowcaseHelper>
          {t({
            en: "The radius scale reads as a hierarchy: tighter corners on small controls, softer corners on the surfaces that hold them, and a full pill for chips and avatars.",
            zh: "圆角阶梯本身就是一套层级：小控件用更紧的圆角，承载它们的表面用更柔和的圆角，标签与头像则用完整的胶囊形。",
          })}
        </ShowcaseHelper>
        <div css={styles.useRow}>
          <div css={styles.useItem}>
            <div css={[styles.useField]}>
              {t({ en: "Search movies", zh: "搜索电影" })}
            </div>
            <span css={styles.useToken}>
              radius_2 · {t({ en: "inputs", zh: "输入框" })}
            </span>
          </div>
          <div css={styles.useItem}>
            <div css={styles.useCard}>
              <span css={styles.useCardTitle}>
                {t({ en: "Now playing", zh: "正在热映" })}
              </span>
              <span css={styles.useCardBody}>
                {t({ en: "Twelve new titles this week", zh: "本周新增十二部" })}
              </span>
            </div>
            <span css={styles.useToken}>
              radius_3 · {t({ en: "cards", zh: "卡片" })}
            </span>
          </div>
          <div css={styles.useItem}>
            <div css={styles.usePillRow}>
              <span css={styles.usePill}>
                {t({ en: "Popular", zh: "热门" })}
              </span>
              <span css={styles.useAvatar}>QS</span>
            </div>
            <span css={styles.useToken}>
              radius_round · {t({ en: "pills, avatars", zh: "标签、头像" })}
            </span>
          </div>
        </div>
      </Showcase>

      <UsageSnippet
        code={`import { border } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  card: {
    borderWidth: border.size_1,        // hairline surface edge
    borderRadius: border.radius_3,     // 1rem card corner
  },
  pill: { borderRadius: border.radius_round },
});`}
      />

      <DoDont
        do={
          <div css={styles.doCard}>
            <span css={styles.doBadge}>{t({ en: "New", zh: "新" })}</span>
            <span css={styles.doCardText}>
              {t({
                en: "Communicate status with a badge",
                zh: "用徽章传达状态",
              })}
            </span>
          </div>
        }
        doCaption={t({
          en: "Mark a card's category or status with type, a token-themed background, or a badge.",
          zh: "用文字、主题化背景或徽章来标示卡片的类别或状态。",
        })}
        dont={
          <div css={styles.dontCard}>
            <span css={styles.dontBar} aria-hidden />
            <span css={styles.dontCardText}>
              {t({ en: "Leading accent stripe", zh: "首端强调竖条" })}
            </span>
          </div>
        }
        dontCaption={t({
          en: "Never add a vertical colored accent bar on a card's leading edge — it reads as AI slop (DESIGN.md).",
          zh: "切勿在卡片首端加竖向的彩色强调条——它显得粗劣（见 DESIGN.md）。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: space._3,
  },
  // Border-width specimen: a real border at the token thickness, on a surface
  // fill so the rule reads against its ground.
  widthSwatch: {
    blockSize: "56px",
    borderStyle: "solid",
    borderColor: color.textMuted,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
  },
  w1: { borderWidth: border.size_1 },
  w2: { borderWidth: border.size_2 },
  w3: { borderWidth: border.size_3 },
  w4: { borderWidth: border.size_4 },
  w5: { borderWidth: border.size_5 },
  // Radius specimen: a filled tile whose corner is rounded at the true radius.
  radiusSwatch: {
    blockSize: "80px",
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  r1: { borderRadius: border.radius_1 },
  r2: { borderRadius: border.radius_2 },
  r3: { borderRadius: border.radius_3 },
  r4: { borderRadius: border.radius_4 },
  r5: { borderRadius: border.radius_5 },
  rRound: { borderRadius: border.radius_round },
  useRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: space._3,
    alignItems: "start",
  },
  useItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    minInlineSize: 0,
  },
  useField: {
    display: "flex",
    alignItems: "center",
    minBlockSize: "40px",
    paddingInline: space._3,
    borderRadius: border.radius_2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
    fontSize: font.uiBodySmall,
    color: color.textSubtle,
  },
  useCard: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  useCardTitle: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  useCardBody: {
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  usePillRow: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    minBlockSize: "40px",
  },
  usePill: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._0,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    backgroundColor: color.surfaceAccentSubtle,
    color: color.accentText,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
  },
  useAvatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._7,
    blockSize: space._7,
    borderRadius: border.radius_round,
    backgroundColor: color.accent,
    color: color.accentOn,
    fontSize: font.uiCaption,
    fontWeight: font.weight_7,
  },
  useToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  // Do panel: a card that carries its status through a badge, not a stripe.
  doCard: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  doBadge: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._00,
    paddingInline: space._1,
    borderRadius: border.radius_round,
    backgroundColor: color.surfaceAccentSubtle,
    color: color.accentText,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    flexShrink: 0,
  },
  doCardText: {
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  // Don't panel: the banned pattern, shown so the guidance is concrete.
  dontCard: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    overflow: "hidden",
  },
  dontBar: {
    inlineSize: space._0,
    alignSelf: "stretch",
    minBlockSize: space._5,
    borderRadius: border.radius_round,
    backgroundColor: color.accent,
    flexShrink: 0,
  },
  dontCardText: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
});
