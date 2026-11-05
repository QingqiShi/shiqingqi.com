import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, font, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

export function CornerSection() {
  const api: ApiEntry[] = [
    {
      token: "corner.radius_1 – radius_5",
      meta: "_1 · _2 · _3 · _4 · _5",
      description: t({
        en: "Squircle corner at each border.radius step — borderRadius and cornerShape in one declaration.",
        zh: "在每一级 border.radius 上配对的超椭圆角——borderRadius 与 cornerShape 写在同一条声明里。",
      }),
    },
    {
      token: "corner.radius_round",
      meta: "cornerShape:round",
      description: t({
        en: "Circular caps for pills, avatars, and circles — a clamped superellipse reads as neither.",
        zh: "胶囊形、头像与圆形保留圆弧端帽——超椭圆在钳制后既不像胶囊形也不像圆形。",
      }),
    },
    {
      token: "corner.squircle_round",
      meta: "cornerShape:squircle",
      description: t({
        en: "The full-round squircle, closing at half a control's height — a Button's shape, falling back to a rounded box rather than a pill.",
        zh: "全圆角超椭圆，在半个控件高度处闭合——Button 的形状，不支持时回退为圆角矩形而非胶囊形。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Corner", zh: "圆角原语" })}>
      <ShowcaseHelper>
        {t({
          en: "Pairs each border.radius step with its corner shape in one declaration — squircle on the fixed steps, circular caps on radius_round — so corners ship shaped without a global corner-shape rule. A browser without corner-shape support keeps circular corners.",
          zh: "在同一条声明中为每一级 border.radius 配对角形——固定阶梯用超椭圆角，radius_round 用圆弧端帽——无需全局 corner-shape 规则。不支持 corner-shape 的浏览器会回退为圆弧。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen caption="corner.radius_3 — card">
          <div css={[corner.radius_3, styles.cornerCard]} />
        </Specimen>
        <Specimen caption="corner.radius_round — pill">
          <span
            css={[typeRole.caption, corner.radius_round, styles.cornerPill]}
          >
            {t({ en: "Popular", zh: "热门" })}
          </span>
        </Specimen>
        <Specimen caption="corner.squircle_round — button">
          <div css={[corner.squircle_round, styles.cornerButton]} />
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";

<div css={corner.radius_3}>…</div>
<span css={corner.radius_round}>…</span>
<button css={[corner.squircle_round, styles.button]}>…</button>`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // Corner specimens — corner.* already sets borderRadius, so these only add
  // the fill and text styling around it.
  cornerCard: {
    inlineSize: "100%",
    blockSize: "72px",
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  cornerPill: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._1,
    paddingInline: space._4,
    fontWeight: font.weight_6,
    color: color.fgAccent,
    backgroundColor: color.bgAccentSubtle,
  },
  // corner.squircle_round closes at half of cornerTokens.height, so this sets
  // it to the box's own height — skip it and the NO_CORNER_SHAPE fallback
  // sizes off the wrong height.
  cornerButton: {
    [cornerTokens.height]: controlHeight.md,
    inlineSize: "120px",
    blockSize: cornerTokens.height,
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
});
