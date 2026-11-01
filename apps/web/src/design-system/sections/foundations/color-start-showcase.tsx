import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Text } from "@tuja/ui/components/text";
import { Example } from "#src/design-system/example.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

export function ColorStartShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Let the component pick the colour.",
        zh: "让组件来选颜色。",
      })}
      lead={t({
        en: "Where a component offers a choice of colour, it is a prop that sets the fill, the text and any edge together. Name a token only when you build or restyle an element yourself.",
        zh: "组件提供颜色选择时，这个选择就是一个属性，同时设定填充、文字与边缘（如果有）。只有自行构建或改写元素样式时，才需要写出令牌。",
      })}
    >
      <Example>
        <Text tone="muted">
          {t({ en: "Saved 2 minutes ago", zh: "2 分钟前已保存" })}
        </Text>
        <Badge intent="success">{t({ en: "Synced", zh: "已同步" })}</Badge>
      </Example>
      <GuideNote>
        {t({
          en: "Only a primary, danger or isActive Button fills with colour.",
          zh: "只有 primary、danger 或 isActive 的 Button 才用颜色填充。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "To recolour one component, use its css prop or its Tokens, as in ",
          zh: "要给某个组件换颜色，请用它的 css 属性或令牌，见",
        })}
        <DocLink path="/design-system/foundations/customization" />
        {t({ en: ".", zh: "。" })}
      </GuideNote>
    </GuideSection>
  );
}
