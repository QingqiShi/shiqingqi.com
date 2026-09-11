import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { CodeBlockShowcase } from "#src/components/design-system/sections/components/code-block-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/code-block",
    description: t({
      en: "The syntax-highlighted code component: coloured runs grouped into parts, each a box of its own, so a documentation page's usage sample and the Lab's live snippet share one component.",
      zh: "带语法高亮的代码组件：将彩色片段按 part 分组，每个 part 各占一格，因此文档页面的用法示例与 Lab 的实时代码片段共用同一个组件。",
    }),
  });
}

export default function CodeBlockPage() {
  return (
    <DocPage
      path="/design-system/components/code-block"
      description={t({
        en: "Pass source for a static sample, or parts to let a change play like a code-walkthrough slide — what stays slides to its new place, what arrives rises in, and what leaves fades where it stood.",
        zh: "传入 source 呈现静态示例，或传入 parts，让改动像代码讲解幻灯片一样播放——保留的部分滑动到新位置，新增的部分升起淡入，离开的部分原地淡出。",
      })}
    >
      <CodeBlockShowcase />
    </DocPage>
  );
}
