import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

/** The border colour tokens, each drawn as the 1px edge it is meant to be. */
export function ColorBordersShowcase() {
  const edges = [
    { token: "color.border", edge: edgeStyles.border },
    { token: "color.borderAccent", edge: edgeStyles.accent },
    { token: "color.borderInfo", edge: edgeStyles.info },
    { token: "color.borderSuccess", edge: edgeStyles.success },
    { token: "color.borderWarning", edge: edgeStyles.warning },
    { token: "color.borderDanger", edge: edgeStyles.danger },
  ];
  return (
    <GuideSection
      title={t({ en: "Borders", zh: "边框" })}
      lead={t({
        en: "One quiet default edge, and one edge per Intent in the same tone as its fill.",
        zh: "一种安静的默认边缘，外加每种意图色各一种、与其填充同色调的边缘。",
      })}
    >
      <GuideList
        items={[
          {
            term: "color.border",
            value: t({
              en: "Every ordinary edge",
              zh: "所有普通的边缘",
            }),
            note: t({
              en: "A card, a field, a divider. It is also the neutral Intent's border, so neutral has no border token of its own.",
              zh: "卡片、输入框、分隔线。它也是中性意图色的边框，因此中性没有自己的边框令牌。",
            }),
          },
          {
            term: "color.border<Intent>",
            value: t({
              en: "An edge that carries the Intent",
              zh: "承载意图的边缘",
            }),
            note: t({
              en: "A selected option's edge, a Callout's edge, a field with an error in borderDanger. The focus ring of a11y.focusRing is borderAccent. Each shares its tone with bg<Intent>, so a fill and its edge never drift apart.",
              zh: "选中选项的边缘、Callout 的边缘、出错输入框的 borderDanger。a11y.focusRing 的焦点环是 borderAccent。每一种都与 bg<Intent> 共用色调，因此填充与边缘不会彼此偏离。",
            }),
          },
          {
            term: "color.borderMaterialGlass…",
            value: t({ en: "Glass's rim", zh: "玻璃的边缘" }),
            note: t({
              en: "borderMaterialGlass and borderMaterialGlassHighlight belong to glassSurface. Change them through glassTokens, which the Material page documents.",
              zh: "borderMaterialGlass 与 borderMaterialGlassHighlight 属于 glassSurface。请通过 glassTokens 调整，详见“质感”页。",
            }),
          },
        ]}
      />
      <ul css={styles.list}>
        {edges.map(({ token, edge }) => (
          <li key={token} css={[corner.radius_2, styles.edge, edge]}>
            <span css={styles.token}>
              <Identifier>{token}</Identifier>
            </span>
          </li>
        ))}
      </ul>
      <UsageSnippet
        code={`import { border, color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  option: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  selected: { borderColor: color.borderAccent },
});

<label css={[styles.option, isSelected && styles.selected]} />`}
      />
      <GuideNote>
        {t({
          en: "Whether a surface needs a border at all, and how heavy it may be, is on ",
          zh: "表面是否需要边框、边框可以有多重，见",
        })}
        <DocLink path="/design-system/foundations/surfaces" />
        {t({ en: ".", zh: "。" })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 11rem), 1fr))",
    gap: space._2,
  },
  edge: {
    display: "flex",
    alignItems: "flex-end",
    minBlockSize: "64px",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    minInlineSize: 0,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_2,
    color: color.fgMuted,
    overflowWrap: "anywhere",
  },
});

const edgeStyles = stylex.create({
  border: { borderColor: color.border },
  accent: { borderColor: color.borderAccent },
  info: { borderColor: color.borderInfo },
  success: { borderColor: color.borderSuccess },
  warning: { borderColor: color.borderWarning },
  danger: { borderColor: color.borderDanger },
});
