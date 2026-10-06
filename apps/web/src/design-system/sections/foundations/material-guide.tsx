import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function MaterialGuide() {
  const treatments = [
    {
      term: "texture.dot",
      value: "@tuja/ui/primitives/texture.stylex",
      note: t({
        en: "Sets backgroundImage, backgroundSize and backgroundPosition: a grid of faint dots over the element's background colour.",
        zh: "设置 backgroundImage、backgroundSize 与 backgroundPosition：在元素的背景色之上画一格格淡淡的点。",
      }),
    },
    {
      term: "wash.toBottom",
      value: "@tuja/ui/primitives/wash.stylex",
      note: t({
        en: "Sets backgroundImage only: one tone fading to transparent, so the element's background colour shows at the far end. toTop, toRight and toLeft fade the other ways.",
        zh: "只设置 backgroundImage：一种色调渐变到透明，元素的背景色因此在远端透出来。toTop、toRight 与 toLeft 朝其他方向渐变。",
      }),
    },
    {
      term: "glassSurface.base",
      value: "@tuja/ui/components/glass-surface.stylex",
      note: t({
        en: "Sets backgroundColor, backdropFilter and boxShadow, and draws its rim on the ::before pseudo-element. In @tuja/ui, only SegmentedControl's selected segment uses it.",
        zh: "设置 backgroundColor、backdropFilter 与 boxShadow，并在 ::before 伪元素上画出边缘。在 @tuja/ui 里，只有 SegmentedControl 的选中分段使用它。",
      }),
    },
  ];

  return (
    <GuideSection
      title={t({ en: "What each one sets", zh: "各自设置了什么" })}
      lead={t({
        en: "Each Material is a style object that you add to the element's css after its surface styles. A later style that sets the same property replaces it, so check what each one sets before you combine them.",
        zh: "每种质感都是一个样式对象，加在元素 css 中表面样式之后。后面的样式若设置同一个属性就会取代它，所以组合之前先看清各自设置了什么。",
      })}
    >
      <GuideList items={treatments} />
      <UsageSnippet
        code={`import { cardSurface } from "@tuja/ui/components/card.stylex";
import { texture } from "@tuja/ui/primitives/texture.stylex";

// cardSurface sets the background colour; texture.dot draws over it.
<div css={[cardSurface.base, texture.dot, styles.panel]} />`}
      />
      <GuideNote>
        {t({
          en: "texture.dot and wash both set backgroundImage, so on one element only the later one shows. To use both, put the wash on one element and the texture on another inside it.",
          zh: "texture.dot 与 wash 都设置 backgroundImage，所以在同一个元素上只有后面那个会显示。要两者兼用，把淡彩放在一个元素上，把纹理放在它里面的另一个元素上。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "No component uses texture or wash. They are for your own surfaces.",
          zh: "没有组件使用 texture 或 wash，它们是留给你自己的表面的。",
        })}
      </GuideNote>
    </GuideSection>
  );
}
