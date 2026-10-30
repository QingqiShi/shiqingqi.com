import { t } from "@tuja/i18n";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";

export function GetStartedImportMap() {
  return (
    <GuideSection
      title={t({ en: "Where to import from", zh: "从哪里导入" })}
      lead={t({
        en: "There is no index file. Every Token group, Primitive, component and hook has its own path, and an import from any other path fails.",
        zh: "没有汇总导出的入口文件。每组令牌、每个原语、组件与钩子都有自己的路径，从其他路径导入都会失败。",
      })}
    >
      <GuideList
        items={[
          {
            term: "@tuja/ui/tokens.stylex",
            value:
              "color · font · space · controlSize · border · shadow · layer · opacity · ratio · layout · constants",
            note: t({
              en: "Every design value the components use.",
              zh: "组件所用的全部设计值。",
            }),
          },
          {
            term: "@tuja/ui/breakpoints.stylex",
            value: "breakpoints",
            note: t({
              en: "sm, md, lg and xl as min-width media queries, used as keys.",
              zh: "sm、md、lg与xl，均为min-width媒体查询，用作键。",
            }),
          },
          {
            term: "@tuja/ui/primitives/<name>.stylex",
            value:
              "flex · stack · layout · corner · motion · a11y · reset · root · texture · wash",
            note: t({
              en: "Style objects that set several properties at once, such as flex.row or a11y.focusRing.",
              zh: "一次设置多个属性的样式对象，例如flex.row或a11y.focusRing。",
            }),
          },
          {
            term: "@tuja/ui/components/<name>",
            note: t({
              en: "One component per path, such as @tuja/ui/components/text-field.",
              zh: "每个路径一个组件，例如 @tuja/ui/components/text-field。",
            }),
          },
          {
            term: "@tuja/ui/components/<name>.stylex",
            note: t({
              en: "A component's own Tokens and its look as a style object, such as buttonTokens or cardSurface.",
              zh: "组件自身的令牌，以及以样式对象形式提供的组件外观，例如buttonTokens或cardSurface。",
            }),
          },
          {
            term: "@tuja/ui/hooks/<name>",
            note: t({
              en: "A component's behaviour without its markup, such as use-disclosure, and the effect layer hooks.",
              zh: "不带标记结构的组件行为，例如use-disclosure，以及效果层的钩子。",
            }),
          },
          {
            term: "@tuja/ui/types",
            value: "StyleProp",
            note: t({
              en: "The type of every css prop.",
              zh: "所有css属性的类型。",
            }),
          },
          {
            term: "@tuja/ui/utils/<name>",
            value: "contrast-ratio · merge-refs · get-scroll-behavior",
            note: t({
              en: "Small helpers, such as mergeRefs to give one element two refs, and contrastRatio to check two colours.",
              zh: "小工具函数，例如让一个元素同时接收两个ref的mergeRefs，以及检查两种颜色对比度的contrastRatio。",
            }),
          },
          {
            term: "@tuja/ui/motion/<name>",
            value:
              "spring-roles · use-motion-engine · use-binding · play-layout · prefers-reduced-motion · use-reduced-motion",
            note: t({
              en: "The motion engine, for motion that can be interrupted, follows a gesture, or is measured from the layout, and the one reduced-motion setting that it and the components read.",
              zh: "动效引擎，用于可被打断、跟随手势或由布局测量而来的动效；以及它与各组件共同读取的那一个减弱动效设置。",
            }),
          },
          {
            term: "@tuja/ui/test-support/install-jsdom-shims",
            value: "installJsdomShims",
            note: t({
              en: "Call it once from a Vitest setup file before you test components in jsdom. It adds the DOM members the components read and jsdom leaves out.",
              zh: "在jsdom中测试组件之前，从Vitest的setup文件中调用一次。它补上组件会读取、而jsdom缺少的DOM成员。",
            }),
          },
          {
            term: "@tuja/ui/palette/<hue>.stylex",
            note: t({
              en: "The fixed Tones of each Hue, for tools and reference. Style with a colour Token instead: a Token changes with the colour scheme, and a Tone does not.",
              zh: "每个色相的固定色调，供工具与参考使用。设置样式请改用颜色令牌：令牌会随配色方案变化，色调不会。",
            }),
          },
        ]}
      />
    </GuideSection>
  );
}
