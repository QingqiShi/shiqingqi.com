import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { TypeSample } from "../../type-sample.tsx";

export function ResponsiveSizesShowcase() {
  return (
    <Showcase label={t({ en: "Responsive sizes", zh: "响应式字号" })}>
      <ShowcaseHelper>
        {t({
          en: "Viewport-responsive sizes (vp*) step at the sm/md/lg breakpoints — use them on landing pages where headlines need to grow with the canvas. The page heading above uses font.vpDisplay.",
          zh: "视口响应字号（vp*）在 sm/md/lg 断点处分级——适用于落地页中需要随画布扩展的标题。本页主标题即采用 font.vpDisplay。",
        })}
      </ShowcaseHelper>
      <div css={[flex.col, styles.stack]}>
        <TypeSample
          label="font.vpDisplay"
          meta="2 · 2.8 · 3.75 · 5.25rem"
          sizeStyle={styles.vpDisplay}
        >
          {t({ en: "Display", zh: "展示" })}
        </TypeSample>
        <TypeSample
          label="font.vpSubDisplay"
          meta="1 · 1.1 · 1.3 · 1.6rem"
          sizeStyle={styles.vpSubDisplay}
        >
          {t({ en: "Sub-display", zh: "副展示" })}
        </TypeSample>
        <TypeSample
          label="font.vpHeading1"
          meta="1.3 · 1.4 · 1.6 · 2rem"
          sizeStyle={styles.vpHeading1}
        >
          {t({ en: "Heading 1", zh: "标题 1" })}
        </TypeSample>
        <TypeSample
          label="font.vpHeading2"
          meta="1.2 · 1.3 · 1.5 · 1.8rem"
          sizeStyle={styles.vpHeading2}
        >
          {t({ en: "Heading 2", zh: "标题 2" })}
        </TypeSample>
        <TypeSample
          label="font.vpHeading3"
          meta="1 · 1.1 · 1.2 · 1.3rem"
          sizeStyle={styles.vpHeading3}
        >
          {t({ en: "Heading 3", zh: "标题 3" })}
        </TypeSample>
      </div>
      <ShowcaseHelper>
        {t({
          en: "Container-responsive sizes (cq*) track their parent's inline size — use them inside responsive grids where the type should scale with item width, not viewport. font.cqTitle clamps between 1.1rem and 1.4rem; the two containers below render the same token at different widths.",
          zh: "容器响应字号（cq*）随父级行内尺寸变化——适用于希望字号追踪容器宽度的响应式网格。font.cqTitle 在 1.1rem 与 1.4rem 之间夹值；下方两个容器以不同宽度呈现同一令牌。",
        })}
      </ShowcaseHelper>
      <div css={styles.cqDemo}>
        <div css={styles.cqContainer}>
          <span css={styles.cqContainerLabel}>font.cqTitle · narrow</span>
          <p css={styles.cqTitle}>
            {t({ en: "Container title", zh: "容器标题" })}
          </p>
        </div>
        <div css={styles.cqContainer}>
          <span css={styles.cqContainerLabel}>font.cqTitle · wide</span>
          <p css={styles.cqTitle}>
            {t({ en: "Container title", zh: "容器标题" })}
          </p>
        </div>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._4,
  },
  vpDisplay: {
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
  },
  vpSubDisplay: {
    fontSize: font.vpSubDisplay,
    fontWeight: font.weight_5,
  },
  vpHeading1: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
  },
  vpHeading2: {
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
  },
  vpHeading3: {
    fontSize: font.vpHeading3,
    fontWeight: font.weight_6,
  },
  cqTitle: {
    margin: 0,
    fontSize: font.cqTitle,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  cqDemo: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "1fr 2.5fr",
    },
    gap: space._3,
  },
  cqContainer: {
    containerType: "inline-size",
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.background2,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  cqContainerLabel: {
    display: "block",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    marginBlockEnd: space._1,
  },
});
