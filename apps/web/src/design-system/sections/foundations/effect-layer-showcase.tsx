import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { EffectLayerRipple } from "./effect-layer-ripple.tsx";
import { EffectLayerTestBench } from "./effect-layer-test-bench.tsx";

const USAGE = `"use client";

import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";

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
              en: "The browser still paints the page. The effect layer adds <canvas> elements over the content, and only on a page where an element uses an effect. They sit under the header, sticky chrome and every overlay.",
              zh: "页面仍由浏览器绘制。效果层在内容之上加入 <canvas> 元素，而且只在有元素使用效果的页面上加入。它们位于页头、吸顶栏和所有覆盖层之下。",
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
              en: "What the layer draws shows over the content, so an effect can show on an element with a background of its own. The <canvas> elements are inert: clicks, hover, text selection and focus reach the content under them.",
              zh: "效果层绘制的东西显示在内容之上，因此效果也能出现在带有自身背景的元素上。这些 <canvas> 元素是惰性的：点击、悬停、选择文字和焦点都会到达它们下方的内容。",
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
              en: "Attach the ref from useEffectBoundary to one element, and the layer measures its border box, its corner radii and its background colour. The element signals when these can have changed, and the next frame measures that element again: when content above moves it, when it resizes, when the theme changes, when hover or focus changes its fill and while a transition runs. A frame with no signal measures nothing, and a window scroll needs no new measurement.",
              zh: "把 useEffectBoundary 返回的 ref 挂到一个元素上，效果层就会测量它的边框盒、圆角半径和背景色。这些值可能变化时，元素会发出信号，下一帧只重新测量这个元素：上方内容推动它、它改变尺寸、主题切换、悬停或聚焦改变填充，以及过渡进行期间。没有信号的帧不测量任何元素，窗口滚动也不需要重新测量。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Every effect reads every registered element, so an effect can draw around its own elements and react to the others and to the pointer. Each effect has a hook of its own that registers its element the same way, so an element with an effect needs no useEffectBoundary as well. To give one element two effects, merge their refs with mergeRefs.",
              zh: "每个效果都能读取所有已登记的元素，因此效果可以围绕自己的元素绘制，并对其他元素和指针作出反应。每个效果都有自己的 hook，以同样的方式登记元素，因此带有效果的元素不必再使用 useEffectBoundary。要让一个元素同时拥有两个效果，用 mergeRefs 合并它们的 ref。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

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
