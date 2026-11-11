import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  absoluteFill,
  imageContain,
  imageCover,
  scrollX,
  truncate,
} from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

export function LayoutSection() {
  const sampleImage = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7c5cff'/><stop offset='1' stop-color='#22d3ee'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><circle cx='160' cy='90' r='52' fill='#ffffff' fill-opacity='0.92'/></svg>",
  )}`;
  const imageAlt = t({ en: "Sample 16:9 artwork", zh: "示例 16:9 图像" });

  const api: ApiEntry[] = [
    {
      token: "absoluteFill.all / x / y",
      meta: "position:absolute · inset:0",
      description: t({
        en: "Pin an overlay to its positioned parent on both axes or one.",
        zh: "将覆盖层固定到定位父元素——两个轴向或单个轴向。",
      }),
    },
    {
      token: "viewportAnchor.fixed",
      meta: "position:fixed · 0 × 0",
      description: t({
        en: "Anchor an overlay to the viewport origin. The layers inside it bring their own size, which keeps Safari on iOS from flattening the status bar.",
        zh: "将覆盖层锚定到视口原点。其中的图层各自携带尺寸，避免 iOS Safari 把状态栏涂成纯色。",
      }),
    },
    {
      token: "viewportFill.absolute",
      meta: "position:absolute · 100vw × 100dvh",
      description: t({
        en: "One viewport-sized layer inside the anchor — a scrim, a modal backdrop, a blur box.",
        zh: "锚点内与视口等大的图层——遮罩、模态背景、虚化层。",
      }),
    },
    {
      token: "fill.inline",
      meta: "inline-size:100%",
      description: t({
        en: "Take the whole track. A block-level child of a flex or grid parent shrinks to its content otherwise.",
        zh: "占满整个轨道。否则，弹性或网格父元素下的块级子元素会收缩到内容宽度。",
      }),
    },
    {
      token: "scrollX.base",
      meta: "overflow-x:auto · scrollbar:none",
      description: t({
        en: "Horizontal scroller; add a11y.focusRing for a keyboard-navigable strip.",
        zh: "水平滚动容器；加上 a11y.focusRing 即可用键盘导航。",
      }),
    },
    {
      token: "scrollY.base",
      meta: "overflow-y:auto",
      description: t({
        en: "Vertical scroll container.",
        zh: "垂直滚动容器。",
      }),
    },
    {
      token: "truncate.base",
      meta: "overflow · ellipsis · nowrap",
      description: t({
        en: "The three-property single-line ellipsis primitive.",
        zh: "单行省略号的三属性原语。",
      }),
    },
    {
      token: "imageCover.base",
      meta: "object-fit:cover · 100%",
      description: t({
        en: "Fill the frame and crop the overflow — poster art, avatars.",
        zh: "填满外框并裁掉溢出——海报、头像。",
      }),
    },
    {
      token: "imageContain.base",
      meta: "object-fit:contain · 100%",
      description: t({
        en: "Fit the whole image inside the frame, letterboxing as needed.",
        zh: "在外框内完整显示图像，必要时留边。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Layout", zh: "布局" })}>
      <ShowcaseHelper>
        {t({
          en: "Position fills, scroll containers, truncation, and image fit — the recurring layout primitives that would otherwise be copy-pasted property clusters.",
          zh: "定位填充、滚动容器、文本截断与图像适配——否则就得到处复制粘贴的重复布局原语。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen caption="truncate.base">
          <Text
            as="div"
            look="bodySmall"
            css={[corner.radius_2, styles.truncateBox, truncate.base]}
          >
            {t({
              en: "The Shawshank Redemption — Extended Director's Cut, Remastered",
              zh: "肖申克的救赎——加长导演剪辑版，重制修复",
            })}
          </Text>
        </Specimen>
        <Specimen
          caption={t({
            en: "absoluteFill.all — overlay",
            zh: "absoluteFill.all —— 覆盖层",
          })}
        >
          <div css={[corner.radius_2, styles.fillTile]}>
            <div css={[absoluteFill.all, styles.fillScrim]}>
              <span css={[typeRole.caption, styles.fillLabel]}>
                {t({ en: "Now playing", zh: "正在播放" })}
              </span>
            </div>
          </div>
        </Specimen>
        <Specimen caption="scrollX.base + a11y.focusRing">
          <div
            tabIndex={0}
            css={[
              scrollX.base,
              a11y.focusRing,
              corner.radius_2,
              styles.scrollStrip,
            ]}
            aria-label={t({ en: "Scrollable strip", zh: "可滚动条带" })}
          >
            <div css={[flex.row, styles.scrollTrack]}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Text
                  key={n}
                  as="div"
                  look="caption"
                  tone="muted"
                  css={[corner.radius_2, styles.scrollTile]}
                >
                  {n}
                </Text>
              ))}
            </div>
          </div>
        </Specimen>
        <Specimen
          caption={t({
            en: "imageCover vs imageContain",
            zh: "imageCover 与 imageContain",
          })}
        >
          <div css={[flex.row, styles.imagePair]}>
            <div css={[corner.radius_2, styles.imageFrame]}>
              <img src={sampleImage} alt={imageAlt} css={imageCover.base} />
            </div>
            <div css={[corner.radius_2, styles.imageFrame]}>
              <img src={sampleImage} alt={imageAlt} css={imageContain.base} />
            </div>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { truncate, absoluteFill, imageCover } from "@tuja/ui/primitives/layout.stylex";

<span css={truncate.base}>{longTitle}</span>
<div css={absoluteFill.all}>{scrim}</div>
<img css={imageCover.base} src={src} alt={alt} />`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // Layout specimens
  truncateBox: {
    inlineSize: "100%",
    maxInlineSize: "220px",
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: color.card,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  fillTile: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "96px",
    overflow: "hidden",
    backgroundImage: `linear-gradient(135deg, ${color.primary}, ${color.info})`,
  },
  fillScrim: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundImage: `linear-gradient(to top, ${color.overlay}, transparent)`,
  },
  fillLabel: {
    fontWeight: font.weight_6,
    color: color.overlayForeground,
  },
  scrollStrip: {
    inlineSize: "100%",
    paddingBlock: space._1,
  },
  scrollTrack: {
    gap: rhythm.item,
    inlineSize: "max-content",
  },
  scrollTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "72px",
    blockSize: "48px",
    fontFamily: font.familyMono,
    backgroundColor: color.card,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  imagePair: {
    gap: rhythm.item,
    inlineSize: "100%",
  },
  imageFrame: {
    inlineSize: "80px",
    blockSize: "80px",
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: color.muted,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
});
