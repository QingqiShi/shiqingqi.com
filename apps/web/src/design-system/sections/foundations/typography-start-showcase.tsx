import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { Example } from "#src/design-system/example.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

/** Copy goes through Text and Heading; other text composes a type role. */
export function TypographyStartShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Let Text and Heading set the role.",
        zh: "让 Text 与 Heading 设定角色。",
      })}
      lead={t({
        en: "Each look of Text and Heading is the type role of the same name, and the element is a separate choice. For text they cannot set, put a type role first in the css array.",
        zh: "Text 与 Heading 的每个 look 就是同名的字体角色，元素则另行选择。对于它们无法排出的文字，请把字体角色放在 css 数组的第一位。",
      })}
    >
      <Example>
        <div css={stack.item}>
          <Heading level={3} look="display">
            {t({ en: "Kyoto in four days", zh: "京都四日游" })}
          </Heading>
          <Text look="bodySmall" tone="muted">
            {t({ en: "Prices include tax.", zh: "价格已含税。" })}
          </Text>
          <span css={[typeRole.body, typeModifier.numeric]}>¥42,800</span>
        </div>
      </Example>
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "Over a role you may change the weight, but never the size, line height or tracking.",
            zh: "在角色之上可以改字重，但不要改字号、行高或字距。",
          })}
        </GuideNote>
        <GuideNote>
          {t({ en: "Every prop is on the pages for ", zh: "全部属性见" })}
          <DocLink path="/design-system/components/text" />
          {t({ en: " and ", zh: "与" })}
          <DocLink path="/design-system/components/heading" />
          {t({ en: ".", zh: "组件页。" })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}
