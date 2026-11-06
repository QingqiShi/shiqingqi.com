import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { CodeBlockShowcase } from "#src/design-system/sections/components/code-block-showcase.tsx";
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
    <DocPage path="/design-system/components/code-block">
      <CodeBlockShowcase />
    </DocPage>
  );
}
