import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { LayoutBreakpointBands } from "#src/design-system/sections/foundations/layout-breakpoint-bands.tsx";
import { LayoutMeasureSpecimen } from "#src/design-system/sections/foundations/layout-measure-specimen.tsx";
import { LayoutRhythmLadder } from "#src/design-system/sections/foundations/layout-rhythm-ladder.tsx";
import { LayoutScalesSpecimen } from "#src/design-system/sections/foundations/layout-scales-specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/layout",
    description: t({
      en: "Which length to use where, when the layout changes with the screen, how long a line of prose runs, and how surfaces stack.",
      zh: "哪种长度用在哪里，布局何时随屏幕变化，一行正文多长，以及表面如何层叠。",
    }),
  });
}

export default function LayoutPage() {
  return (
    <DocPage
      path="/design-system/foundations/layout"
      description={t({
        en: "Take your lengths, breakpoints and z-indexes from the same tokens as the components, and what you build lines up with them.",
        zh: "长度、断点与 z-index 都取自组件所用的同一套令牌，你搭建的东西就能与组件对齐。",
      })}
    >
      <GuideSection
        title={t({
          en: "Pick the scale by where the length goes.",
          zh: "按长度所在的位置选阶梯。",
        })}
        lead={t({
          en: "Use the rhythm tokens between things, the space tokens around them, and controlSize inside a control. The components split their lengths the same way.",
          zh: "事物之间用 rhythm 令牌，事物周围用 space 令牌，控件内部用 controlSize。组件也是这样划分长度的。",
        })}
      >
        <LayoutScalesSpecimen />
        <GuideNote>
          {t({
            en: "controlSize is 20% larger below md, so a control is a larger target on a phone.",
            zh: "controlSize 在 md 以下大 20%，控件在手机上因此是更大的点按目标。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Take minBlockSize from controlHeight, so a control grows with larger text.",
            zh: "minBlockSize 取自 controlHeight，文字调大时控件随之变高。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Space things by how they relate.",
          zh: "按事物之间的关系留间距。",
        })}
        lead={t({
          en: "Pick the rhythm step by how two things relate, not by how big the gap looks. Each step is about twice the one below, so the space alone shows what belongs together.",
          zh: "按两者之间的关系选 rhythm 的级别，而不是按间隙看起来有多大。每一级约是下一级的两倍，单凭间距就能看出哪些内容属于一起。",
        })}
      >
        <LayoutRhythmLadder />
        <GuideNote>
          {t({
            en: "Lines of text in one item take no gap: use stack.text.",
            zh: "同一项中的几行文字不留间隙：使用 stack.text。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Put the gap on the container, so a child that hides or wraps keeps the rhythm.",
            zh: "把间隙放在容器上，子元素隐藏或换行时节奏不变。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Change the layout at md.", zh: "在 md 处改变布局。" })}
        lead={t({
          en: "A breakpoint is a min-width key inside a style, over a default for the narrowest screen. The components change only at md, so change your main layout there too.",
          zh: "断点是样式里的最小宽度键，覆盖最窄屏幕的默认值。组件只在 md 处变化，所以你的主要布局也在这里变化。",
        })}
      >
        <LayoutBreakpointBands />
        <UsageSnippet
          code={`import { breakpoints } from "@tuja/ui/breakpoints.stylex";

const styles = stylex.create({
  list: {
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
  },
});`}
        />
        <GuideNote>
          {t({
            en: "At md, the sidebar docks beside the content and Sheet moves to the centre.",
            zh: "到 md 时，侧栏停靠到内容旁边，Sheet 移到屏幕中央。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Cap a line of prose.", zh: "给正文限定行长。" })}
        lead={t({
          en: "The measure tokens cap a line of prose, so the eye finds the next one. They are in em, so a larger text size gets a wider cap and keeps the same number of characters.",
          zh: "measure 令牌限制一行正文的长度，让视线能找到下一行。它们以 em 为单位，所以字号越大上限越宽，每行的字数不变。",
        })}
      >
        <LayoutMeasureSpecimen />
        <GuideNote>
          {t({
            en: "A Text paragraph caps itself at measure.prose; a span or a caption does not.",
            zh: "Text 渲染的段落自己限制在 measure.prose；span 与 caption 不受限制。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "When the column is narrower than a cap, the column sets the line instead.",
            zh: "栏宽小于上限时，由栏宽决定行长。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Stack surfaces by name, never by number.",
          zh: "按名字层叠表面，绝不用数字。",
        })}
        lead={t({
          en: "Take a z-index from layer, so its name sets your order among the components. Put it on the outermost element: a z-index never leaves its stacking context.",
          zh: "z-index 从 layer 取，名字决定了你在组件之间的顺序。把它放在最外层的元素上：z-index 出不了自己的层叠上下文。",
        })}
      >
        <UsageSnippet
          code={`import { layer } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  filterBar: { position: "sticky", insetBlockStart: 0, zIndex: layer.raised },
});`}
        />
        <GuideNote>
          {t({
            en: "A stuck bar of your own takes layer.raised: above the content, under the header.",
            zh: "你自己的吸顶栏吸附时取 layer.raised：高于内容，低于页头。",
          })}
        </GuideNote>
      </GuideSection>
    </DocPage>
  );
}
