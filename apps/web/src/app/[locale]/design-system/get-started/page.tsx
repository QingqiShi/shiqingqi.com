import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Callout } from "@tuja/ui/components/callout";
import { Text } from "@tuja/ui/components/text";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { GetStartedLayers } from "#src/design-system/sections/get-started/get-started-layers.tsx";
import { GetStartedRipple } from "#src/design-system/sections/get-started/get-started-ripple.tsx";
import { designSystemMetadata } from "../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/get-started",
    description: t({
      en: "What @tuja/ui is, how it is organised, and where to go for what you want.",
      zh: "@tuja/ui 是什么、如何组织，以及想要什么该去哪里。",
    }),
  });
}

export default function GetStartedPage() {
  return (
    <DocPage
      path="/design-system/get-started"
      description={t({
        en: "@tuja/ui is a design system for React: the decisions behind an interface and the parts that follow them, in one package.",
        zh: "@tuja/ui 是一个 React 设计系统：界面背后的决策，以及遵循这些决策的零件，都在同一个包里。",
      })}
    >
      <Callout
        intent="neutral"
        icon={<HourglassMediumIcon weight="regular" />}
        title={t({ en: "Not published yet", zh: "尚未发布" })}
      >
        {t({
          en: "Right now @tuja/ui runs only on qingqi.dev and its apps. A public package is on the way.",
          zh: "目前 @tuja/ui 只用在 qingqi.dev 及其应用中。公开的包正在准备中。",
        })}
      </Callout>

      <GuideSection
        title={t({ en: "Know the three layers.", zh: "认识三个层次。" })}
        lead={t({
          en: "Everything in the system sits in one of three layers. Each piece has its own import path under @tuja/ui.",
          zh: "系统里的一切都归入三个层次之一。每一项都有自己的 @tuja/ui 导入路径。",
        })}
      >
        <GetStartedLayers />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Press a button and watch it ripple.",
          zh: "按下按钮，看它泛起涟漪。",
        })}
        lead={t({
          en: "Rings spread out from its edge, drawn on the GPU in a layer over the page. Hover and keyboard focus start a pulse too.",
          zh: "圆环从它的边缘向外扩散，由 GPU 绘制在页面之上的一个图层里。悬停和键盘聚焦也会发出一次脉动。",
        })}
      >
        <GetStartedRipple />
        <GuideNote>
          {t({
            en: "Without WebGPU, nothing draws, and every control works the same.",
            zh: "没有 WebGPU 时什么都不绘制，所有控件照常工作。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Switch the language or the theme at the bottom of the sidebar, or in the menu on a phone, and every page follows.",
            zh: "在侧边栏底部切换语言或深浅色模式，手机上则在菜单里，每个页面都会随之改变。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Start from what you want.", zh: "由目标出发。" })}
        lead={t({
          en: "Three ways in, by what you came for.",
          zh: "按你来的目的，有三个入口。",
        })}
      >
        <Text tone="muted">
          <Text as="span" weight="semibold">
            {t({ en: "For the thinking,", zh: "想了解设计思路，" })}
          </Text>
          {t({ en: " read ", zh: "读" })}
          <DocLink path="/design-system/foundations/principles" />
          {t({ en: ".", zh: "。" })}
        </Text>
        <Text tone="muted">
          <Text as="span" weight="semibold">
            {t({ en: "For one component,", zh: "想找某个组件，" })}
          </Text>
          {t({ en: " search the ", zh: "在" })}
          <DocLink path="/design-system" />
          {t({
            en: ", then open its Lab where it has one.",
            zh: "中搜索；有实验室的组件，再打开它的实验室。",
          })}
        </Text>
        <Text tone="muted">
          <Text as="span" weight="semibold">
            {t({ en: "For a whole page,", zh: "想看一整个页面，" })}
          </Text>
          {t({ en: " open ", zh: "打开" })}
          <DocLink path="/design-system/examples/movie-detail" />
          {t({
            en: ", built from nothing but this system.",
            zh: "，它完全由本系统搭建。",
          })}
        </Text>
      </GuideSection>
    </DocPage>
  );
}
