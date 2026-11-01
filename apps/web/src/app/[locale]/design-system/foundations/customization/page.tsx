import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { CustomizationContentExample } from "#src/design-system/sections/foundations/customization-content-example.tsx";
import { CustomizationSurfaceExample } from "#src/design-system/sections/foundations/customization-surface-example.tsx";
import { CustomizationTokensExample } from "#src/design-system/sections/foundations/customization-tokens-example.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/customization",
    description: t({
      en: "Three ways to change a @tuja/ui component, from a prop to your own element, in the order to try them.",
      zh: "改变 @tuja/ui 组件的三种方式，从一个属性到你自己的元素，按应当尝试的顺序排列。",
    }),
  });
}

export default function CustomizationPage() {
  return (
    <DocPage
      path="/design-system/foundations/customization"
      description={t({
        en: "Three ways to change a component: its props, your styles, or your own element. Each leaves more of the work to you, so stop at the first one that does the job.",
        zh: "改变组件有三种方式：它的属性、你的样式，或你自己的元素。每一种都比上一种留给你更多的工作，所以用第一种能完成任务的方式即可。",
      })}
    >
      <GuideSection
        title={t({ en: "Start with props.", zh: "先从属性开始。" })}
        lead={t({
          en: "Props choose a size or a look, or put your content in a fixed place, such as trailing. The component keeps the styles, the ARIA and the keyboard.",
          zh: "属性可以选择尺寸或外观，也可以把你的内容放在固定的位置，例如 trailing。样式、ARIA 与键盘操作依然由组件负责。",
        })}
      >
        <CustomizationContentExample />
        <GuideNote>
          {t({
            en: "Screen readers skip trailing and most icons, so put their meaning in the label.",
            zh: "读屏软件会跳过 trailing 与多数图标，所以请把它们的含义写进 label。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Links in components reload the whole page until you pass linkComponent.",
            zh: "组件里的链接会重新加载整个页面，直到你传入 linkComponent。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Style the outside, and reach inside with Tokens.",
          zh: "设置外部的样式，用令牌深入内部。",
        })}
        lead={t({
          en: "Your css wins over the component's own styles, on one element, most often the outer one. To change a part inside, set the component's Tokens in that css.",
          zh: "你的 css 会胜过组件自身的样式，但只作用于一个元素，多数情况下是最外层元素。要改变内部部件，请在这个 css 里设置组件的令牌。",
        })}
      >
        <CustomizationTokensExample />
        <GuideNote>
          {t({
            en: "A longhand such as paddingInline beats the shorthand padding, whatever the order.",
            zh: "paddingInline 这样的完整属性总会胜过简写属性 padding，与顺序无关。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "TextField and Textarea put css on the field, so a margin lands under the label.",
            zh: "TextField 与 Textarea 把 css 用在输入框上，因此外边距会落在标签下方。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Do not set Tokens the component sets itself, such as progressTokens.indicatorSize.",
            zh: "不要设置组件自己设定的令牌，例如 progressTokens.indicatorSize。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Build your own from the system's parts.",
          zh: "用系统的零件自己搭建。",
        })}
        lead={t({
          en: "When nothing above fits, write the element yourself, such as a list item, which Card cannot be. Take a component's surface for the look, and Tokens and Primitives for the rest.",
          zh: "当以上方式都不合适时，就自己写元素，例如 Card 无法成为的列表项。外观取自组件的表面样式，其余交给令牌与原语。",
        })}
      >
        <CustomizationSurfaceExample />
        <GuideNote>
          {t({
            en: "A surface is the look only: no ARIA, no keyboard handling and no padding.",
            zh: "表面样式只有外观：没有 ARIA、没有键盘处理，也没有内边距。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "For the behaviour, a hook brings state, ARIA and keyboard. Every hook is on ",
            zh: "行为交给钩子，它提供状态、ARIA 与键盘操作。全部钩子都在",
          })}
          <DocLink path="/design-system/hooks" />
          {t({ en: ".", zh: "页面。" })}
        </GuideNote>
      </GuideSection>
    </DocPage>
  );
}
