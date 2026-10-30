import { t } from "@tuja/i18n";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

/**
 * The opening section of the Colour page: the props through which a
 * component already picks its colour, before any token is named.
 */
export function ColorStartShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Let the component pick the colour",
        zh: "让组件自己选颜色",
      })}
      lead={t({
        en: "Every component paints itself from the colour tokens. Where it offers a choice, the choice is a prop, and the prop sets the background, the text on it and the edge together. You name a token only when you build your own element.",
        zh: "每个组件都用颜色令牌绘制自己。组件提供选择的地方，选择就是一个属性，这个属性会同时设定背景、其上的文字与边缘。只有自行构建元素时才需要写出令牌。",
      })}
    >
      <GuideList
        items={[
          {
            term: "Button look",
            value: '"primary" · "danger"',
            note: t({
              en: "primary fills the button with the accent, danger with the danger colour. Leave look out for the neutral button. isActive gives a toggle the same accent fill as primary.",
              zh: "primary用强调色填充按钮，danger用危险色填充。省略look即为中性按钮。isActive让切换按钮得到与primary相同的强调色填充。",
            }),
          },
          {
            term: "Badge intent",
            value: t({
              en: "Any Intent, or default",
              zh: "任一意图色，或default",
            }),
            note: t({
              en: "An Intent puts its tint behind the label and its own foreground on it. default is the one with a border and no tint.",
              zh: "意图色会在标签后铺上它的淡色，并让标签使用它自己的前景色。default是唯一带边框、没有淡色的样式。",
            }),
          },
          {
            term: "Callout intent",
            value: t({ en: "Any Intent", zh: "任一意图色" }),
            note: t({
              en: "The tint, a border in the Intent's colour, and the icon and title in its foreground. danger and warning also announce the Callout as an alert.",
              zh: "淡色背景、意图色的边框，以及使用其前景色的图标与标题。danger与warning还会把提示框作为警报播报。",
            }),
          },
          {
            term: "Text tone",
            value: '"default" · "muted" · "accent"',
            note: t({
              en: "The text colour: color.fg, color.fgMuted or color.fgAccent. Heading has no tone and is always color.fg.",
              zh: "文字颜色：color.fg、color.fgMuted或color.fgAccent。Heading没有tone，始终为color.fg。",
            }),
          },
          {
            term: "Spinner tone",
            value: '"current" · "accent"',
            note: t({
              en: "current, the default, takes the colour of the text around it, so the Spinner a busy Button shows matches its label.",
              zh: "默认值current沿用周围文字的颜色，因此忙碌状态的Button所显示的Spinner与按钮标签同色。",
            }),
          },
        ]}
      />
      <UsageSnippet
        code={`import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";

<Text tone="muted">Saved 2 minutes ago</Text>
<Badge intent="success">Synced</Badge>
<Button look="danger">Delete trip</Button>`}
      />
      <GuideNote>
        {t({
          en: "To change one colour in one component, set the property through its css prop, or through the component's own Tokens where it has them. Both are on ",
          zh: "要改动某个组件里的某一种颜色，可通过它的css属性设置该属性；组件有自身令牌时，也可以通过这些令牌设置。两种做法见",
        })}
        <DocLink path="/design-system/foundations/customization" />
        {t({ en: ".", zh: "。" })}
      </GuideNote>
    </GuideSection>
  );
}
