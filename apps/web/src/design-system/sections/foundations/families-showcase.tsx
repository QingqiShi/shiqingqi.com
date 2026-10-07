import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { t } from "#src/i18n.ts";

export function FamiliesShowcase() {
  return (
    <GuideSection
      title={t({ en: "Families", zh: "字体族" })}
      lead={t({
        en: "Two families. font.family is Inter, for all interface text. The root sets it on body and text inherits it. A browser does not pass it down to a button or an input by default, so the components that render one declare it again, and so should your own. font.familyMono is IBM Plex Mono, which CodeBlock uses for code.",
        zh: "两种字体族。font.family 是 Inter，用于所有界面文字。根元素在 body 上设置了它，文字会继承它。浏览器默认不会把它传给按钮或输入框，因此渲染这类元素的组件会再声明一次，你自建的也应如此。font.familyMono 是 IBM Plex Mono，CodeBlock 用它显示代码。",
      })}
    >
      <div css={styles.grid}>
        <div css={[stack.item, corner.radius_2, styles.card]}>
          <header css={stack.tight}>
            <span css={styles.token}>
              <Identifier>font.family</Identifier>
            </span>
            <code css={styles.value}>Inter, Inter-fallback, sans-serif</code>
          </header>
          <div css={[styles.specimen, styles.sans]}>Aa</div>
          <div css={[styles.charset, styles.sans]}>
            <p css={styles.charsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p css={styles.charsetLine}>abcdefghijklmnopqrstuvwxyz</p>
            <p css={styles.charsetLine}>0123456789 — &amp; ?!“”</p>
          </div>
        </div>
        <div css={[stack.item, corner.radius_2, styles.card]}>
          <header css={stack.tight}>
            <span css={styles.token}>
              <Identifier>font.familyMono</Identifier>
            </span>
            <code css={styles.value}>
              &quot;IBM Plex Mono&quot;, &quot;IBM Plex Mono-fallback&quot;,
              ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
            </code>
          </header>
          <div css={[styles.specimen, styles.mono]}>Aa</div>
          <div css={[styles.charset, styles.mono]}>
            <p css={styles.charsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p css={styles.charsetLine}>abcdefghijklmnopqrstuvwxyz</p>
            <p css={styles.charsetLine}>{"0123456789 — & ?! {}"}</p>
          </div>
        </div>
      </div>
      <GuideNote>
        {t({
          en: "The package ships no font file. Each name in a stack works only once your app declares that face; until then the browser moves on to the next name. Neither family has Chinese glyphs, so Chinese text takes the platform's own sans-serif or monospace. How to serve Inter and declare Inter-fallback is on ",
          zh: "这个包不附带任何字体文件。字体栈中的每个名称，只有在你的应用声明了对应字体后才会生效；在此之前，浏览器会转向下一个名称。两种字体族都不含中文字形，因此中文文字使用平台自带的无衬线或等宽字体。如何提供 Inter 并声明 Inter-fallback，见",
        })}
        <DocLink path="/design-system/foundations/get-started" />
        {t({ en: ".", zh: "。" })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: rhythm.item,
  },
  card: {
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    minInlineSize: 0,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.fg,
  },
  value: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_4,
    color: color.fgMuted,
    overflowWrap: "anywhere",
  },
  specimen: {
    fontSize: {
      default: "5rem",
      [breakpoints.md]: "6rem",
    },
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_0,
    letterSpacing: font.trackingTight,
    color: color.fg,
  },
  charset: {
    fontSize: font.uiBodySmall,
    color: color.fgMuted,
    lineHeight: font.lineHeight_3,
    overflowWrap: "anywhere",
  },
  charsetLine: {
    margin: 0,
  },
  sans: { fontFamily: font.family },
  mono: { fontFamily: font.familyMono },
});
