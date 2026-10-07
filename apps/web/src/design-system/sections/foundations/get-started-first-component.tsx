import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";

export function GetStartedFirstComponent() {
  return (
    <GuideSection
      title={t({ en: "Render a component", zh: "渲染一个组件" })}
      lead={t({
        en: "Import each component from its own path, such as @tuja/ui/components/button, and render it. There is no provider to mount first.",
        zh: "从各自的路径导入每个组件，例如 @tuja/ui/components/button，然后渲染它。不需要先挂载任何提供者。",
      })}
    >
      <Specimen
        caption={t({
          en: "Two components, no set-up in the page",
          zh: "两个组件，页面内无需任何设置",
        })}
      >
        <Callout
          intent="success"
          title={t({ en: "Trip saved", zh: "行程已保存" })}
        >
          {t({
            en: "Kyoto, 5 days, opens without a connection.",
            zh: "京都 5 日行程可离线打开。",
          })}
        </Callout>
        <Button look="primary">
          {t({ en: "Share trip", zh: "分享行程" })}
        </Button>
      </Specimen>
      <GuideList
        items={[
          {
            term: t({ en: "Server Components", zh: "服务端组件" }),
            note: t({
              en: 'A component that needs the browser carries its own "use client", so you can render any component from a Server Component. Tokens and Primitives are plain style objects and work on either side.',
              zh: '需要浏览器的组件会自带 "use client"，因此你可以在服务端组件中渲染任意组件。令牌与原语只是普通的样式对象，在两端都能使用。',
            }),
          },
          {
            term: t({ en: "Words you supply", zh: "由你提供的文字" }),
            value: "label · dismissLabel · closeLabel · menuLabel",
            note: t({
              en: "The package ships no strings in any language. Where a component needs an accessible name that your content does not give it, such as a dismiss button or a progress bar, the prop is required and type-checked.",
              zh: "这个包不附带任何语言的文字。凡是组件需要、而你的内容又没有提供的无障碍名称，例如关闭按钮或进度条的名称，对应的属性都是必填的，并受类型检查约束。",
            }),
          },
          {
            term: "EffectLayerProvider",
            note: t({
              en: "Mount it only for the effect layer hooks, which do nothing without it. No component needs it.",
              zh: "只有使用效果层的钩子时才需要挂载它，没有它这些钩子不起作用。没有任何组件需要它。",
            }),
          },
        ]}
      />
    </GuideSection>
  );
}
