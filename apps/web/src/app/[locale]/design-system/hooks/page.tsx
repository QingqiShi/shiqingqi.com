import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { HooksShowcase } from "#src/components/design-system/sections/hooks/hooks-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/hooks",
    title: t({ en: "Hooks", zh: "钩子" }),
    description: t({
      en: "Headless React hooks — controlled state, dialog focus, tactile press, and roving-tabindex radiogroups — the behavioural half of the custom layer.",
      zh: "无头 React 钩子——受控状态、对话框焦点、触感按压与 roving-tabindex 单选组——自定义层中负责行为的一半。",
    }),
  });
}

export default function HooksPage() {
  return (
    <DocPage
      title={t({ en: "Hooks", zh: "钩子" })}
      description={t({
        en: "The custom layer's behaviour, decoupled from its looks. These headless hooks carry the hard parts — controlled/uncontrolled state, focus trapping, press physics, and accessible keyboard models — so a bespoke control can borrow the guarantees without inheriting a single opinion about how it should look.",
        zh: "自定义层的行为，与外观解耦。这些无头钩子承担了棘手的部分——受控/非受控状态、焦点困陷、按压物理与可访问的键盘模型——让自定义控件无需继承任何外观定见即可借用这些保证。",
      })}
    >
      <HooksShowcase />
    </DocPage>
  );
}
