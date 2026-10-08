import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { CustomizationBuiltExample } from "#src/design-system/sections/foundations/customization-built-example.tsx";
import { CustomizationContentExample } from "#src/design-system/sections/foundations/customization-content-example.tsx";
import { CustomizationPropsExample } from "#src/design-system/sections/foundations/customization-props-example.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

const LINK_COMPONENT = `import { AnchorButton } from "@tuja/ui/components/anchor-button";
import Link from "next/link";

<AnchorButton href="/trips" linkComponent={Link}>
  All trips
</AnchorButton>;`;

const CSS_OVERRIDE = `import * as stylex from "@stylexjs/stylex";
import { Callout } from "@tuja/ui/components/callout";
import { space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  roomy: { padding: space._5 },
});

<Callout intent="info" css={styles.roomy}>
  Prices update every night.
</Callout>;`;

const COMPONENT_TOKENS = `import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  wide: { [buttonTokens.paddingInline]: controlSize._6 },
});

<Button look="primary" css={styles.wide}>
  Book
</Button>;`;

const SURFACE_ON_LINK = `import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";

const styles = stylex.create({
  card: {
    display: "block",
    padding: space._5,
  },
});

<Link
  href="/trips/kyoto"
  {...stylex.props(cardSurface.base, cardSurface.interactive, styles.card)}
>
  Kyoto, 5 days
</Link>;`;

const HEADLESS = `"use client";

import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";

export function TripRow() {
  const { open, triggerProps, panelProps } = useDisclosure();
  return (
    <div>
      <a href="/trips/kyoto">Kyoto</a>
      <button {...triggerProps}>{open ? "Hide days" : "Show days"}</button>
      <ol {...panelProps}>…</ol>
    </div>
  );
}`;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/customization",
    description: t({
      en: "Every way @tuja/ui lets you change a component — props, your own content, a router link, css, a component's Tokens, its look on your own element, its behaviour in a hook — and what each one leaves to you.",
      zh: "@tuja/ui 允许你改变组件的每一种方式——属性、你自己的内容、路由链接、css、组件自身的令牌、把它的外观用在你自己的元素上、在钩子中复用它的行为——以及每种方式留给你负责的部分。",
    }),
  });
}

export default function CustomizationPage() {
  return (
    <DocPage
      path="/design-system/foundations/customization"
      description={t({
        en: "A component can be changed in several ways. This page orders them from the one that leaves the least to you to the one that leaves the most: each step down keeps less of what the component did for you.",
        zh: "改变一个组件有好几种方式。这里按留给你负责的部分从少到多排列：每往下一步，组件替你做的事就少一些。",
      })}
    >
      <GuideSection
        title={t({ en: "Choose with props", zh: "用属性选择" })}
        lead={t({
          en: "Props such as look, intent, size and tone choose from fixed sets, and the component sets the colours, sizes and ARIA that go with the choice. Every other attribute of the element underneath, such as name, onClick or aria-describedby, passes through to it.",
          zh: "look、intent、size 与 tone 等属性从固定的选项中选择，组件会设置与所选项相配的颜色、尺寸与 ARIA。底层元素的其他任何属性，例如 name、onClick 或 aria-describedby，都会原样传给它。",
        })}
      >
        <CustomizationPropsExample />
        <GuideNote>
          {t({
            en: "On a form field, the attributes reach the native control: the input of TextField, Checkbox and Slider, and the select of Select, not the wrapper around them.",
            zh: "在表单字段上，这些属性会传给原生控件：TextField、Checkbox 与 Slider 的 input，以及 Select 的 select，而不是包在它们外面的容器。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Pass your own content", zh: "传入你自己的内容" })}
        lead={t({
          en: "Props that take a node, such as icon, title, trailing or actions, put your content in a fixed place. The component still places, sizes and colours it.",
          zh: "接收节点的属性，例如 icon、title、trailing 或 actions，会把你的内容放在固定的位置。组件依然负责它的位置、尺寸与颜色。",
        })}
      >
        <CustomizationContentExample />
        <GuideList
          items={[
            {
              term: t({ en: "Hidden places", zh: "被隐藏的位置" }),
              value:
                "icon · separator · TextField leading · TextField trailing",
              note: t({
                en: "The component renders these aria-hidden, so a screen reader never reads them. Put no label and no control there; TextField's leading and trailing also ignore the pointer.",
                zh: "组件会以 aria-hidden 渲染这些内容，屏幕阅读器永远不会读到它们。不要在这里放标签或控件；TextField 的 leading 与 trailing 还会忽略指针操作。",
              }),
            },
            {
              term: t({ en: "Read places", zh: "会被读出的位置" }),
              value: "title · summary · description · actions · Chip trailing",
              note: t({
                en: "These stay in the accessibility tree. Chip's trailing, such as a count, becomes part of the chip's name.",
                zh: "这些内容保留在无障碍树中。Chip 的 trailing（例如一个计数）会成为标签按钮名称的一部分。",
              }),
            },
            {
              term: t({ en: "Parts you arrange", zh: "由你编排的部件" }),
              value: "Card* · Table*",
              note: t({
                en: "Card and Table come as sets of parts, such as CardHeader, CardContent and CardFooter. You choose which parts to use and in what order.",
                zh: "Card 与 Table 以一组部件的形式提供，例如 CardHeader、CardContent 与 CardFooter。用哪些部件、按什么顺序，由你决定。",
              }),
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Render your router's link", zh: "渲染你的路由链接" })}
        lead={t({
          en: "AnchorButton and Breadcrumb render a plain <a> unless you pass linkComponent. Pass your framework's link component to keep client-side navigation.",
          zh: "除非传入 linkComponent，AnchorButton 与 Breadcrumb 都渲染普通的 <a>。传入你所用框架的链接组件，即可保留客户端导航。",
        })}
      >
        <UsageSnippet code={LINK_COMPONENT} />
        <GuideNote>
          {t({
            en: "The component gives your link className, style, ref and event handlers, and these carry its look and its press animation. A wrapper of your own must pass every one of them to the anchor; next/link already does.",
            zh: "组件会把 className、style、ref 与事件处理函数交给你的链接，组件的外观与按压动画都靠它们传递。你自己封装的链接组件必须把这些全部转交给锚点；next/link 本身已经这样做了。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Override styles with css", zh: "用 css 覆盖样式" })}
        lead={t({
          en: "A component adds your css after its own styles, so where both set the same property, yours wins.",
          zh: "组件会把你的 css 加在自身样式之后，因此当双方设置同一个属性时，你的值胜出。",
        })}
      >
        <UsageSnippet code={CSS_OVERRIDE} />
        <GuideList
          items={[
            {
              term: t({ en: "Set the same property", zh: "设置同一个属性" }),
              note: t({
                en: "Conflicts resolve by property: a longhand such as paddingInline beats a shorthand such as padding, whatever the order. Callout sets paddingBlock and paddingInline, so the override above sets those; padding would lose to them.",
                zh: "冲突按属性解决：paddingInline 这样的完整属性总会胜过 padding 这样的简写属性，与顺序无关。Callout 设置的是 paddingBlock 与 paddingInline，所以上面的覆盖也设置这两个；若写 padding 则会输给它们。",
              }),
            },
            {
              term: t({ en: "One element", zh: "只作用于一个元素" }),
              note: t({
                en: "css styles one element, and each component's css prop says which. Most style the outer element. TextField and Textarea style the input itself, so a margin lands under the label, inside the field. Checkbox, Select and Slider style the wrapper.",
                zh: "css 只作用于一个元素，每个组件的 css 属性说明会写明是哪一个。多数组件作用于最外层元素。TextField 与 Textarea 作用于输入框本身，因此外边距会落在标签下方、字段内部。Checkbox、Select 与 Slider 作用于外层容器。",
              }),
            },
            {
              term: t({ en: "Inner parts", zh: "内部部件" }),
              note: t({
                en: "css cannot reach an element inside the component. Change an inner part through the component's Tokens, below, or through a prop that takes a node.",
                zh: "css 无法作用于组件内部的元素。要改变内部部件，请通过下文所述的组件自身令牌，或通过接收节点的属性。",
              }),
            },
            {
              term: t({ en: "No css", zh: "不接收 css" }),
              value:
                "MenuButton · Overlay · HeaderFooterLayout · SidebarLayout",
              note: t({
                en: "MenuButton takes css for its trigger inside buttonProps. The other three take none.",
                zh: "MenuButton 通过 buttonProps 为其触发按钮接收 css。其余三个都不接收。",
              }),
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Change one value with a component's Tokens",
          zh: "用组件自身的令牌改变一个值",
        })}
        lead={t({
          en: "Some components read sizes and colours from Tokens of their own, exported from the .stylex path beside them. Set one through css and that value changes everywhere the component uses it, inner parts included.",
          zh: "有些组件从自身的令牌读取尺寸与颜色，这些令牌从组件旁边的 .stylex 路径导出。通过 css 设置其中一个，组件内用到这个值的每一处都会随之改变，包括内部部件。",
        })}
      >
        <UsageSnippet code={COMPONENT_TOKENS} />
        <GuideList
          items={[
            {
              term: "buttonTokens",
              value:
                "backgroundColor · backgroundColorHover · color · boxShadow · height · paddingInline",
              note: t({
                en: 'Button and AnchorButton. A Token you set wins over the one size or look chose. look="primary" and isActive paint a fixed accent background, so backgroundColor does not change them.',
                zh: 'Button 与 AnchorButton。你设置的令牌会胜过 size 或 look 所选的值。look="primary" 与 isActive 绘制固定的强调色背景，因此 backgroundColor 改变不了它们。',
              }),
            },
            {
              term: "switchTokens",
              value: "trackHeight · thumbShadow · thumbTransitionDuration",
              note: t({
                en: "Switch. The track height sets the size of the whole switch.",
                zh: "Switch。轨道高度决定整个开关的尺寸。",
              }),
            },
            {
              term: "sliderTokens",
              value: "trackHeight · thumbSize",
              note: t({ en: "Slider.", zh: "Slider。" }),
            },
            {
              term: "progressTokens",
              value: "indicatorColor",
              note: t({
                en: "Progress. The indicator is drawn by a pseudo-element, which css cannot reach.",
                zh: "Progress。指示条由伪元素绘制，css 无法作用于它。",
              }),
            },
            {
              term: "skeletonTokens",
              value: "width · height · delay",
              note: t({ en: "Skeleton.", zh: "Skeleton。" }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "Leave alone progressTokens.indicatorSize and switchTokens.thumbPosition. The component sets them from its value on every render, and a value you set replaces that, so the control stops showing its state.",
            zh: "请不要设置 progressTokens.indicatorSize 与 switchTokens.thumbPosition。组件每次渲染时都根据自身的值设置它们，你设置的值会取而代之，控件便无法再显示自己的状态。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Put a component's look on your own element",
          zh: "把组件的外观用在你自己的元素上",
        })}
        lead={t({
          en: "Each component renders one fixed element: Card is always a div. Only Text and the two page layouts take an as prop. When you need another element, such as a whole card that is a link, put the component's exported look on that element.",
          zh: "每个组件都渲染一个固定的元素：Card 始终是 div。只有 Text 与两个页面布局组件接收 as 属性。当你需要别的元素时，例如整张卡片就是一个链接，请把组件导出的外观用在那个元素上。",
        })}
      >
        <UsageSnippet code={SURFACE_ON_LINK} />
        <GuideList
          items={[
            {
              term: "cardSurface",
              value: "base · interactive",
              note: t({
                en: "@tuja/ui/components/card.stylex. base is the border, the radius and the fill; interactive adds the hover and the focus ring. Card's padding is not part of it.",
                zh: "@tuja/ui/components/card.stylex。base 是边框、圆角与填充；interactive 加上悬停效果与焦点环。Card 的内边距不包含在内。",
              }),
            },
            {
              term: "chipSurface · chipSize",
              value: "base · interactive · active · sm · md",
              note: "@tuja/ui/components/chip.stylex",
            },
            {
              term: "optionCardSurface",
              value: "base · selected · disabled",
              note: "@tuja/ui/components/option-card.stylex",
            },
            {
              term: "popoverSurface",
              value: "base · inner · enter",
              note: "@tuja/ui/components/popover-surface.stylex",
            },
            {
              term: "glassSurface · glassTokens",
              value: "base",
              note: t({
                en: "@tuja/ui/components/glass-surface.stylex. Give the element position: relative and a corner Primitive, because its rim is an absolutely positioned pseudo-element that takes the element's corners.",
                zh: "@tuja/ui/components/glass-surface.stylex。请给元素加上 position: relative 与一个 corner 原语，因为它的边缘是一个绝对定位的伪元素，沿用元素的圆角。",
              }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "You get the look and nothing else: no ARIA, no keyboard handling and no padding. On an element from another package, such as next/link, spread stylex.props instead of passing css.",
            zh: "你只得到外观，别无其他：没有 ARIA、没有键盘处理，也没有内边距。在其他包的元素上（例如 next/link），请展开 stylex.props，而不是传入 css。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Keep the behaviour, write the markup",
          zh: "保留行为，自己写标记结构",
        })}
        lead={t({
          en: "Several components are built on hooks the package exports. A hook gives you the state, the ARIA wiring and the keyboard handling; you write the elements and style them.",
          zh: "有几个组件建立在这个包导出的钩子之上。钩子提供状态、ARIA 关联与键盘处理；元素与样式由你来写。",
        })}
      >
        <UsageSnippet code={HEADLESS} />
        <GuideList
          items={[
            {
              term: "useDisclosure",
              value: "Disclosure",
              note: t({
                en: "aria-expanded and aria-controls on the trigger, hidden on the panel. Use it when the row that opens the panel holds another control, as above, so one button cannot wrap the whole row. Keep the panel mounted so aria-controls always points at something.",
                zh: "在触发按钮上设置 aria-expanded 与 aria-controls，在面板上设置 hidden。当展开面板的那一行还包含其他控件时（如上例），一个按钮无法包住整行，这时就用它。请让面板始终挂载，使 aria-controls 总能指向某个元素。",
              }),
            },
            {
              term: "usePopover",
              value: "Popover",
              note: t({
                en: "Placement, and closing on Escape, on a pointer outside and when focus leaves. It does not trap focus or lock scrolling. The popup must be position: fixed, because the hook writes its top and left directly.",
                zh: "负责定位，以及在按下 Escape、指针点到外部、焦点离开时关闭。它不会困住焦点，也不会锁定滚动。弹出层必须是 position: fixed，因为钩子会直接写入它的 top 与 left。",
              }),
            },
            {
              term: "useRadioGroup",
              value: "SegmentedControl · OptionCardGroup",
              note: t({
                en: 'role="radio", aria-checked, a roving tabIndex and the arrow keys for a group of buttons. Add role="radiogroup" and a name to the wrapper yourself.',
                zh: '为一组按钮提供 role="radio"、aria-checked、游走式 tabIndex 与方向键操作。外层容器的 role="radiogroup" 与名称需要你自己添加。',
              }),
            },
            {
              term: "useDialogFocus",
              value: "Overlay · SidebarLayout",
              note: t({
                en: "Moves focus into a dialog, keeps Tab inside it, calls onClose on Escape and gives focus back to the trigger. Scroll locking is not part of it.",
                zh: "把焦点移入对话框，让 Tab 留在其中，按 Escape 时调用 onClose，并把焦点交还给触发元素。它不包含滚动锁定。",
              }),
            },
            {
              term: "usePressHandlers",
              value: "Button · AnchorButton",
              note: t({
                en: "The press animation, for a control that is not a Button.",
                zh: "按压动画，用于不是 Button 的控件。",
              }),
            },
            {
              term: "useControlled · useScrollMask",
              note: t({
                en: "State that works controlled or uncontrolled, and the scroll position that decides when ScrollMask fades an edge.",
                zh: "既可受控也可非受控的状态，以及决定 ScrollMask 何时淡化边缘的滚动位置。",
              }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "Each hook's options and return values are on ",
            zh: "每个钩子的选项与返回值见",
          })}
          <DocLink path="/design-system/hooks" />
          {t({ en: ".", zh: "。" })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Build from Tokens and Primitives",
          zh: "用令牌与原语搭建",
        })}
        lead={t({
          en: "When no component, look or hook fits, build the element yourself. Tokens keep its values those of the system and Primitives give it the same layout, corners and focus ring; everything else is yours.",
          zh: "当没有合适的组件、外观或钩子时，就自己搭建元素。令牌让它的取值与系统一致，原语为它提供相同的布局、圆角与焦点环；其余一切都由你负责。",
        })}
      >
        <CustomizationBuiltExample />
        <GuideList
          items={[
            {
              term: "buttonReset.base · a11y.focusRing",
              note: t({
                en: "For a control you build: a native button with its browser styles removed and the focus ring of every component already on it. Give any other element that takes focus, such as a link, the same ring with a11y.focusRing.",
                zh: "用于你自己搭建的控件：去除了浏览器默认样式的原生按钮，并已带有与所有组件相同的焦点环。其他可获得焦点的元素（例如链接）用 a11y.focusRing 获得同样的焦点环。",
              }),
            },
            {
              term: "css?: StyleProp",
              note: t({
                en: "Give your component a css prop and add it last, as every @tuja/ui component does, so it can be overridden in the same way.",
                zh: "像每个 @tuja/ui 组件那样，给你的组件提供一个 css 属性并放在最后，这样它也能以同样的方式被覆盖。",
              }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "Every Primitive is on ",
            zh: "全部原语见",
          })}
          <DocLink path="/design-system/primitives" />
          {t({ en: ".", zh: "。" })}
        </GuideNote>
      </GuideSection>
    </DocPage>
  );
}
