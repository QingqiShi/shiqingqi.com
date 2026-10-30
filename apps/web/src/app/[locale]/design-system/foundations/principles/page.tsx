import type { Icon } from "@phosphor-icons/react";
import { CubeIcon } from "@phosphor-icons/react/dist/ssr/Cube";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/ssr/MinusCircle";
import { ShapesIcon } from "@phosphor-icons/react/dist/ssr/Shapes";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DocSection } from "#src/design-system/doc-section.tsx";
import {
  PrincipleAnchors,
  PrincipleLink,
  PrincipleMark,
} from "#src/design-system/principles/principle-anchors.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

interface Principle {
  /** The fragment of the principle's section. It stays the same in each language. */
  id: string;
  icon: Icon;
  name: string;
  tagline: string;
  overview: string;
  details: { lead: string; text: string }[];
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/principles",
    description: t({
      en: "Restraint, clarity, space, harmony, inclusion and delight: the principles behind every token and component in the system.",
      zh: "克制、清晰、空间感、和谐、包容与愉悦：系统中每个令牌和组件背后的原则。",
    }),
  });
}

export default function PrinciplesPage() {
  // Chinese text has no space after a full stop.
  const leadSeparator = t({ en: " ", zh: "" });
  const principles: Principle[] = [
    {
      id: "restraint",
      icon: MinusCircleIcon,
      name: t({ en: "Restraint", zh: "克制" }),
      tagline: t({ en: "Let content lead.", zh: "让内容做主角。" }),
      overview: t({
        en: "An interface exists to show people their content and help them act on it. Keep the rest quiet, so what matters stands out and a moment of delight gets noticed.",
        zh: "界面的存在，是为了呈现内容并帮助用户采取行动。其余部分保持安静，重要的内容自然突出，惊喜的时刻也更容易被察觉。",
      }),
      details: [
        {
          lead: t({ en: "Use the least that works.", zh: "够用即可。" }),
          text: t({
            en: "Every border, fill and shadow competes with the content, so add one only when it helps people see the structure.",
            zh: "每一条边框、每一块底色、每一道阴影都在与内容争夺注意力，只在它能帮助用户看清结构时才添加。",
          }),
        },
        {
          lead: t({ en: "Give colour a meaning.", zh: "让颜色有含义。" }),
          text: t({
            en: "Keep most of the interface neutral, so the colour that does appear tells people where to act or what changed.",
            zh: "让界面的大部分保持中性，出现的颜色便能告诉用户该在哪里操作、什么发生了变化。",
          }),
        },
        {
          lead: t({ en: "Leave out decoration.", zh: "舍弃装饰。" }),
          text: t({
            en: "An effect earns its place by answering something a person did. Ornament that means nothing weakens the signals that do.",
            zh: "效果应当回应用户的操作才有存在的意义。没有含义的点缀，会削弱真正有含义的信号。",
          }),
        },
      ],
    },
    {
      id: "clarity",
      icon: EyeIcon,
      name: t({ en: "Clarity", zh: "清晰" }),
      tagline: t({ en: "Be clear at a glance.", zh: "一目了然。" }),
      overview: t({
        en: "People should understand what they see without effort. Clear type, a steady hierarchy and plain words let them read an interface quickly and use it with confidence.",
        zh: "用户应当不费力地看懂眼前的内容。清晰的文字、稳定的层级和平实的措辞，让用户能快速读懂界面，并放心使用。",
      }),
      details: [
        {
          lead: t({ en: "Establish hierarchy.", zh: "建立层级。" }),
          text: t({
            en: "Give each piece of text a role, so its importance shows the same way on every screen.",
            zh: "为每段文字指定角色，让它的重要程度在每个屏幕上都以同样的方式呈现。",
          }),
        },
        {
          lead: t({ en: "Keep text legible.", zh: "保持文字易读。" }),
          text: t({
            en: "Hold text to a comfortable line length and enough contrast, in light and dark.",
            zh: "无论浅色还是深色模式，都让文字保持舒适的行长和足够的对比度。",
          }),
        },
        {
          lead: t({ en: "Say it plainly.", zh: "措辞平实。" }),
          text: t({
            en: "Choose the words people use, and call one thing by one name everywhere.",
            zh: "使用用户熟悉的词语，同一事物在各处使用同一个名称。",
          }),
        },
      ],
    },
    {
      id: "space",
      icon: CubeIcon,
      name: t({ en: "Space", zh: "空间感" }),
      tagline: t({
        en: "Make the space feel real.",
        zh: "让空间真实可感。",
      }),
      overview: t({
        en: "An interface is a place people move through. When things move with weight and come from somewhere, people build a picture of that place without thinking about it.",
        zh: "界面是用户穿行其中的空间。当事物的运动带有分量、有来有去，用户便能不假思索地在脑中构建出这个空间。",
      }),
      details: [
        {
          lead: t({ en: "Show where things come from.", zh: "展示来龙去脉。" }),
          text: t({
            en: "Let what opens grow from what was tapped, and return there when it closes, so people can trace every change.",
            zh: "让展开的内容从被点按的地方生长出来，关闭时再回到那里，使每一次变化都有迹可循。",
          }),
        },
        {
          lead: t({
            en: "Move like real objects.",
            zh: "像真实物体一样运动。",
          }),
          text: t({
            en: "Give every motion weight and a little bounce, and let people interrupt it at any time.",
            zh: "让每个动效都带有分量和些许回弹，并允许用户随时打断。",
          }),
        },
        {
          lead: t({ en: "Keep context in view.", zh: "让上下文保持可见。" }),
          text: t({
            en: "Let what lies beneath show through a floating surface, so people never lose their place.",
            zh: "让下层内容透过浮动的界面隐约可见，用户便不会迷失位置。",
          }),
        },
      ],
    },
    {
      id: "harmony",
      icon: ShapesIcon,
      name: t({ en: "Harmony", zh: "和谐" }),
      tagline: t({
        en: "Make the parts fit together.",
        zh: "让各部分浑然一体。",
      }),
      overview: t({
        en: "An interface feels calm when its parts share one set of sizes, shapes and spacing. Build from the shared pieces, and a new screen fits in from the start.",
        zh: "当各个部分共享同一套尺寸、形状和间距，界面便显得从容。基于这些共享的构件来搭建，新屏幕从一开始就能融入其中。",
      }),
      details: [
        {
          lead: t({ en: "Build from the system.", zh: "从系统出发。" }),
          text: t({
            en: "Reach for an existing component or token before you make your own.",
            zh: "在自己动手之前，先使用现有的组件和令牌。",
          }),
        },
        {
          lead: t({ en: "Keep shapes in step.", zh: "让形状协调。" }),
          text: t({
            en: "Line up controls of the same size, and let a nested corner follow the corner around it.",
            zh: "同一尺寸的控件彼此对齐，嵌套的圆角与外层圆角保持同心。",
          }),
        },
        {
          lead: t({ en: "Space with rhythm.", zh: "有节奏地留白。" }),
          text: t({
            en: "Keep related things close and unrelated things apart, so the layout reads at a glance.",
            zh: "相关的内容靠近，无关的内容分开，让版面一眼就能看清。",
          }),
        },
      ],
    },
    {
      id: "inclusion",
      icon: UsersThreeIcon,
      name: t({ en: "Inclusion", zh: "包容" }),
      tagline: t({ en: "Work for everyone.", zh: "人人可用。" }),
      overview: t({
        en: "People read in English or Chinese, and use touch, a keyboard or a screen reader. Every component works for each of them, so what you build reaches everyone from the start.",
        zh: "用户可能阅读中文或英文，可能使用触控、键盘或读屏软件。每个组件都支持这些方式，你构建的界面从一开始就能服务每个人。",
      }),
      details: [
        {
          lead: t({ en: "Speak both languages.", zh: "兼顾两种语言。" }),
          text: t({
            en: "Check every screen in English and in Chinese, and write each as a native reader would expect.",
            zh: "每个界面都用中英文分别检查，并按母语读者的习惯撰写。",
          }),
        },
        {
          lead: t({
            en: "Support every input.",
            zh: "支持每种输入方式。",
          }),
          text: t({
            en: "Give each control a target large enough to tap, and a focus that a keyboard user can always see.",
            zh: "为每个控件留出足够大的点按区域，并让键盘用户始终看得见焦点。",
          }),
        },
        {
          lead: t({ en: "Respect people's settings.", zh: "尊重用户设置。" }),
          text: t({
            en: "Follow the light or dark appearance and the motion preference that people choose.",
            zh: "遵循用户选择的浅色或深色外观，以及减弱动效的偏好。",
          }),
        },
      ],
    },
    {
      id: "delight",
      icon: SparkleIcon,
      name: t({ en: "Delight", zh: "愉悦" }),
      tagline: t({
        en: "Make it a joy to touch.",
        zh: "让每次触碰都有乐趣。",
      }),
      overview: t({
        en: "Small moments of light and movement make an interface fun to use. They answer what people do, and they never pull attention from the content.",
        zh: "细微的光影与动态让界面用起来充满乐趣。它们回应用户的操作，却从不抢走内容的注意力。",
      }),
      details: [
        {
          lead: t({ en: "Answer every touch.", zh: "回应每一次触碰。" }),
          text: t({
            en: "Let light and ripples respond to the pointer and the finger, so the interface feels alive in people's hands.",
            zh: "让光影与涟漪回应指针与手指，界面在用户手中便有了生命。",
          }),
        },
        {
          lead: t({ en: "Go beyond the ordinary.", zh: "超越寻常。" }),
          text: t({
            en: "Reach for effects a stylesheet alone can't draw, so the moment feels new.",
            zh: "使用仅靠样式表无法实现的效果，让这一刻耳目一新。",
          }),
        },
        {
          lead: t({
            en: "Stay at the edge of attention.",
            zh: "停留在注意力的边缘。",
          }),
          text: t({
            en: "Let an effect be noticed, but never let it get in the way of the task.",
            zh: "效果要能被察觉，但绝不妨碍手头的任务。",
          }),
        },
      ],
    },
  ];

  return (
    <DocPage
      path="/design-system/foundations/principles"
      description={t({
        en: "Six principles shape every token and component in the system. They don't give fixed answers; they help you weigh one choice against another.",
        zh: "六条原则塑造了系统中的每个令牌和组件。它们并非固定的答案，而是帮助你在不同选择之间权衡取舍。",
      })}
    >
      <PrincipleAnchors>
        <div css={styles.overviewContainer}>
          <ul css={styles.overview}>
            {principles.map(
              ({ id, icon: PrincipleIcon, name, tagline, overview }) => (
                <li key={id}>
                  <PrincipleLink id={id}>
                    <span css={[typeRole.subDisplay, styles.icon]}>
                      <PrincipleIcon weight="regular" aria-hidden />
                    </span>
                    <div css={stack.tight}>
                      <p css={[typeRole.h2, styles.name]}>{name}</p>
                      <Text weight="semibold">{tagline}</Text>
                    </div>
                    <Text tone="muted">{overview}</Text>
                  </PrincipleLink>
                </li>
              ),
            )}
          </ul>
        </div>

        {principles.map(({ id, icon: PrincipleIcon, name, details }) => (
          <DocSection
            key={id}
            id={id}
            tabIndex={-1}
            title={
              <>
                <PrincipleMark id={id}>
                  <PrincipleIcon weight="regular" aria-hidden />
                </PrincipleMark>
                {name}
              </>
            }
            titleCss={[typeRole.h1, styles.title]}
            css={[a11y.focusRing, styles.section]}
          >
            {details.map(({ lead, text }) => (
              <Text key={lead} tone="muted">
                <Text as="span" weight="semibold">
                  {lead}
                </Text>
                {leadSeparator}
                {text}
              </Text>
            ))}
          </DocSection>
        ))}
      </PrincipleAnchors>
    </DocPage>
  );
}

const styles = stylex.create({
  // The grid queries this wrapper, not the viewport: the page sits beside a
  // sidebar, so the viewport width does not give the column width.
  overviewContainer: {
    containerType: "inline-size",
  },
  overview: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 38rem)": "repeat(2, minmax(0, 1fr))",
    },
    gap: rhythm.item,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  icon: {
    display: "flex",
    color: color.fg,
  },
  name: {
    margin: 0,
    color: color.fg,
  },
  section: {
    // Below `md`, the menu button floats over the top of the page.
    scrollMarginBlockStart: `calc(${headerControlsTokens.clearance} + ${rhythm.item})`,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
  },
});
