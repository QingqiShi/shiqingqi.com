import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { EffectLayerRipple } from "./effect-layer-ripple.tsx";
import { EffectLayerTestBench } from "./effect-layer-test-bench.tsx";

const USAGE = `import { EffectBoundary } from "@tuja/ui/components/effect-boundary";
import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";

<EffectBoundary>
  <Card>{children}</Card>
</EffectBoundary>

function Row({ children }) {
  const ref = useEffectBoundary();
  return <li ref={ref}>{children}</li>;
}`;

export function EffectLayerShowcase() {
  return (
    <>
      <Showcase label={t({ en: "How it draws", zh: "绘制方式" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The browser still paints the page. The effect layer adds <canvas> elements behind all content, and only on a page where an element uses an effect.",
              zh: "页面仍由浏览器绘制。效果层在全部内容之后加入 <canvas> 元素，而且只在有元素使用效果的页面上加入。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Two <canvas> elements, each a little taller than the viewport, take turns to cover the document as it scrolls, and a third is fixed to the viewport for fixed elements. Each frame draws only the part on screen, and a frame runs only after something changes or while an effect moves.",
              zh: "两个各比视口略高的 <canvas> 元素在文档滚动时轮流覆盖文档，第三个固定在视口上，供固定元素使用。每一帧只绘制屏幕上的部分，而且只在有变化之后或效果仍在运动时才绘制一帧。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Content with a background of its own covers what the layer draws, so an effect shows around an element, not on top of it.",
              zh: "带有自身背景的内容会盖住效果层绘制的东西，因此效果出现在元素周围，而不是元素之上。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Nothing draws without WebGPU, under forced colours, with ?effects=off in the address, or with the effect-layer key in local storage set to off.",
              zh: "没有 WebGPU、处于强制颜色模式、地址中带有 ?effects=off，或本地存储中的 effect-layer 键设为 off 时，什么都不会绘制。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Registering an element", zh: "登记元素" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Wrap one element in EffectBoundary, and the layer measures it at the start of each frame: its border box, its corner radii and its background colour. Each measurement is new, so it follows the element when the page scrolls, when content above moves it, when the theme changes and when hover changes its fill.",
              zh: "用 EffectBoundary 包住一个元素，效果层就会在每一帧开始时测量它：边框盒、圆角半径和背景色。每次测量都是新的，因此页面滚动、上方内容推动它、主题切换、悬停改变填充时，测量结果都会跟上。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Every effect reads every registered element, so an effect can draw around its own elements and react to the others and to the pointer. Inside a list or a table, where a wrapper is not valid markup, attach the ref from useEffectBoundary to the element instead.",
              zh: "每个效果都能读取所有已登记的元素，因此效果可以围绕自己的元素绘制，并对其他元素和指针作出反应。在列表或表格中，包裹元素会破坏标记的有效性，这时改为把 useEffectBoundary 返回的 ref 挂到元素上。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="effect-boundary" />

      <Showcase
        label={t({ en: "Test bench", zh: "测试台" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Open the debug view to see what the layer measured. Each element below gets a line on its edge, green in the page and orange when fixed, and a band of the fill it read. Scroll, resize the window, switch the theme, hover the button and add the block above: the lines stay on the edges. These elements have no effect, so outside the debug view they draw nothing.",
            zh: "打开调试视图，查看效果层测量到的内容。下方每个元素的边缘都有一条线（页面中的为绿色，固定的为橙色），外加一条它读到的填充色带。滚动、调整窗口大小、切换主题、悬停按钮、在上方加入色块：这些线都应贴在边缘上。这些元素没有效果，因此在调试视图之外不会绘制任何东西。",
          })}
        </ShowcaseHelper>
        <div css={styles.debugLink}>
          <AnchorButton href="?effects=debug" look="outline" size="sm">
            {t({ en: "Open the debug view", zh: "打开调试视图" })}
          </AnchorButton>
        </div>
        <EffectLayerTestBench />
      </Showcase>

      <EffectLayerRipple />
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
  debugLink: {
    display: "flex",
  },
});
