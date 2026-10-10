import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

const SETUP = `import * as stylex from "@stylexjs/stylex";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";

const styles = stylex.create({
  body: { position: "relative" },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body css={styles.body}>
        <EffectLayerProvider>{children}</EffectLayerProvider>
      </body>
    </html>
  );
}`;

const REGISTER = `"use client";

import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";

function Row({ children }) {
  const ref = useEffectBoundary();
  return <li ref={ref}>{children}</li>;
}`;

/** Mounting the layer, where it draws, when it draws nothing, and registering an element. */
export function EffectLayerShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Set up", zh: "设置" })}>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Mount EffectLayerProvider once, high in the tree, inside a <body> with position: relative, so that its <canvas> elements cover the document and no more. Until an element registers with an effect, it mounts no <canvas> and requests no GPU device, so a page with no effects pays nothing for it.",
            zh: "在树的高处挂载一次 EffectLayerProvider，放在设置了 position: relative 的 <body> 内，使它的 <canvas> 元素恰好覆盖整个文档。在有元素为效果登记之前，它不挂载任何 <canvas>，也不请求 GPU 设备，因此没有效果的页面不必为它付出任何代价。",
          })}
        </Text>
      </Showcase>

      <UsageSnippet code={SETUP} />

      <PropsTable component="effect-layer-provider" />

      <Showcase label={t({ en: "Where effects draw", zh: "效果绘制的位置" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The browser still paints the page. The layer draws on <canvas> elements over the content, on layer.effect: over everything on layer.content or lower, and under everything on layer.raised or higher, such as sticky chrome, the header and overlays. Chrome inside a stacking context below layer.effect gets drawn over, so keep it out of one.",
              zh: "页面仍由浏览器绘制。效果层在内容之上的 <canvas> 元素上绘制，位于 layer.effect：盖在 layer.content 及以下的一切之上，位于 layer.raised 及以上的一切之下，例如吸顶栏、页头和覆盖层。位于低于 layer.effect 的层叠上下文中的界面框架会被效果盖住，所以不要把它放进这样的上下文。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Because the effects draw over the content, an effect shows on an element with a background of its own. The <canvas> elements are inert: clicks, hover, text selection and focus reach the content under them.",
              zh: "由于效果绘制在内容之上，效果也能出现在带有自身背景的元素上。这些 <canvas> 元素是惰性的：点击、悬停、选择文字和焦点都会到达它们下方的内容。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "CSS filters on the content do not reach the <canvas> elements, except grayscale(): the layer reads it from the filter of each registered element and its ancestors, and draws that element's effects as grey.",
              zh: "内容上的 CSS 滤镜不会作用到这些 <canvas> 元素上，grayscale() 除外：效果层会从每个已登记元素及其祖先元素的 filter 中读取它，并以同样的灰度绘制该元素的效果。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase label={t({ en: "When nothing draws", zh: "何时不绘制" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Nothing draws without WebGPU, under forced colours, with ?effects=off in the address, or with the effect-layer key in local storage set to off. The page under the effects stays the same in every case, so never put meaning in an effect alone.",
              zh: "没有 WebGPU、处于强制颜色模式、地址中带有 ?effects=off，或本地存储中的 effect-layer 键设为 off 时，什么都不会绘制。无论哪种情况，效果之下的页面都保持不变，因此不要只靠效果传达含义。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "?effects=debug in the address shows the debug view: every registered element as the layer measured it, each Effect container with its scope, and the pointer.",
              zh: "地址中带有 ?effects=debug 时会显示调试视图：效果层测量到的每个已登记元素、每个效果容器及其作用域，以及指针。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Registering an element", zh: "登记元素" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Every effect reads every registered element, so an effect can draw around its own elements and react to the others. To make an element one the effects see and flow around, without an effect of its own, attach the ref from useEffectBoundary to it. The layer measures its border box, its corner radii and its background colour, and measures it again when any of them changes.",
              zh: "每个效果都能读取所有已登记的元素，因此效果可以围绕自己的元素绘制，并对其他元素作出反应。若想让一个元素被效果看到并让效果绕开它，而它本身没有效果，就把 useEffectBoundary 返回的 ref 挂到它上面。效果层会测量它的边框盒、圆角半径和背景色，并在其中任何一项变化时重新测量。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Each effect has a hook of its own that registers its element the same way, so an element with an effect needs no useEffectBoundary as well. To give one element two effects, merge their refs with mergeRefs.",
              zh: "每个效果都有自己的 hook，以同样的方式登记元素，因此带有效果的元素不必再使用 useEffectBoundary。要让一个元素同时拥有两个效果，用 mergeRefs 合并它们的 ref。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={REGISTER} />
    </>
  );
}
