import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { AccessibilityShowcase } from "#src/design-system/sections/foundations/accessibility-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/accessibility",
    description: t({
      en: "What the components guarantee for focus, keyboard and announcements, the names and copy you supply, how that copy is read and wrapped, and what you take on in a control of your own.",
      zh: "组件在焦点、键盘与状态播报方面的保障，你需要提供的名称与文案、这些文案如何被朗读与换行，以及自建控件时要承担的部分。",
    }),
  });
}

export default function AccessibilityPage() {
  return (
    <DocPage
      path="/design-system/foundations/accessibility"
      description={t({
        en: "The components do most of the work, but every word they show or announce comes from you. This page says what they handle, which names and copy you supply, and what you take on when you build a control yourself.",
        zh: "大部分工作由组件完成，但它们显示或播报的每个词都来自你。本页说明组件负责什么、你需要提供哪些名称与文案，以及自己搭建控件时要承担什么。",
      })}
    >
      <AccessibilityShowcase />
    </DocPage>
  );
}
