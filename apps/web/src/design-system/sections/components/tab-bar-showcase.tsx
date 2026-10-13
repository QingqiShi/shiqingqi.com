import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { DemoTabBar, LongLabelTabBar } from "./tab-bar-specimens.tsx";

export function TabBarShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Destinations", zh: "目标页" })}>
        <Specimen caption="items">
          <DemoTabBar />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'Each item is a link with an icon over its label. The current one carries aria-current="page" and draws its icon filled; the others draw it bold. Tab reaches every tab in turn and Enter follows it — these are links to pages, not a radiogroup, so there are no arrow keys.',
            zh: '每一项都是一个链接，图标在上、标签在下。当前项带有 aria-current="page"，图标以填充样式绘制；其余项以粗线绘制。Tab 依次进入每个标签页，Enter 打开它——这些是通往页面的链接，而不是单选组，因此没有方向键操作。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Press and drag", zh: "按下与拖动" })}>
        <Specimen caption={t({ en: "drag across", zh: "横向拖动" })}>
          <DemoTabBar narrow />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A press on a tab moves the indicator there at once. Drag from it, and the indicator follows the pointer across the tabs; let go, and the bar follows the link of the tab under it. A tap is a click on the tab's own link, so a modifier key still opens it in a new tab. The indicator stays on the tab it went to while that page loads.",
            zh: "按下某个标签页时，指示块立即移到那里。从这里开始拖动，指示块会随指针在各标签页之间移动；松开后，标签栏打开其下方标签页的链接。轻触就是点击该标签页自身的链接，因此按住修饰键仍会在新标签页中打开。在页面加载期间，指示块停留在它去往的标签页上。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Equal widths", zh: "等宽" })}>
        <Specimen caption={t({ en: "long label", zh: "长标签" })}>
          <LongLabelTabBar />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Every tab takes the same share of the bar, whatever the length of its label, so the bar does not shift when the copy is translated. A label too long for its share ends in an ellipsis: write a shorter one rather than relying on it.",
            zh: "无论标签长短，每个标签页都占据标签栏的同等份额，因此文案翻译后标签栏不会变形。超出所分宽度的标签以省略号结尾：请写一个更短的标签，而不要依赖省略号。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Badge and status", zh: "标记与状态" })}>
        <Specimen caption="badge, status">
          <DemoTabBar badge />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "badge puts a small mark at the icon's top-end corner. It is decorative, so status says what it means: visually hidden text in a status region inside the link, announced when it changes and read as part of the tab's name. Pass null while there is nothing to say, so the region is in place before the text arrives.",
            zh: "badge 在图标右上角放置一个小标记。它是装饰性的，因此由 status 说明其含义：链接内状态区域中视觉上隐藏的文本，变化时会被朗读，并作为标签页名称的一部分读出。没有内容时传入 null，使该区域在文本到来之前就已存在。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Effect", zh: "效果" })}>
        <SpecimenGrid>
          <Specimen caption="liquid">
            <DemoTabBar />
          </Specimen>
          <Specimen caption="none">
            <DemoTabBar effect="none" />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'By default the indicator is the Segmented control\'s liquid: frosted ice that thaws into water, pours to the tab you press and follows a drag with inertia. effect="none" keeps the plain Glass indicator, and so does a bar without an EffectLayerProvider or WebGPU, or under forced colours, where the filled icon marks the current tab.',
            zh: '默认情况下，指示块就是分段控件的液体：一块结霜的冰，融化成水后涌向你按下的标签页，并带着惯性跟随拖动。设置 effect="none" 会保留普通的玻璃指示块；没有 EffectLayerProvider 或 WebGPU，或处于强制颜色模式时也是如此，此时由填充样式的图标标记当前标签页。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { TabBar } from "@tuja/ui/components/tab-bar";
import { tabBarTokens } from "@tuja/ui/components/tab-bar.stylex";

<TabBar
  label="Main"
  linkComponent={Link}
  css={styles.bar}
  items={[
    { href: "/", label: "Home", icon: HouseIcon, current: true },
    { href: "/search", label: "Search", icon: MagnifyingGlassIcon },
  ]}
/>

// The bar does not place itself: float it over the bottom of the
// screen, and keep the content clear of it with its height.
const styles = stylex.create({
  bar: {
    position: "fixed",
    insetInline: space._3,
    insetBlockEnd: \`max(\${space._3}, env(safe-area-inset-bottom))\`,
    zIndex: layer.header,
  },
});`}
          label="tsx"
        />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "tabBarTokens.blockSize is the height of the pill, for the padding that keeps a page's last content above a bar that floats over it. linkComponent takes the framework's link, as AnchorButton's does, so following a tab stays client-side.",
            zh: "tabBarTokens.blockSize 是胶囊的高度，用于设置内边距，使页面末尾的内容不被浮在其上的标签栏遮住。linkComponent 与 AnchorButton 的同名属性一样接收框架自带的链接组件，使切换标签页保持客户端导航。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="tab-bar" />
      <Showcase>
        <ShowcaseHelper>
          {t({
            en: "TabBarItem is { href: string; label: ReactNode; icon: Icon; current?: boolean; badge?: ReactNode; status?: ReactNode } — icon is a Phosphor icon component, which the bar draws filled when the tab is current and bold otherwise.",
            zh: "TabBarItem 的形状是 { href: string; label: ReactNode; icon: Icon; current?: boolean; badge?: ReactNode; status?: ReactNode }——icon 是一个 Phosphor 图标组件，标签页为当前项时以填充样式绘制，否则以粗线绘制。",
          })}
        </ShowcaseHelper>
      </Showcase>
    </>
  );
}
