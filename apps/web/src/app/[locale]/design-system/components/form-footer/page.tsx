import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FormFooterShowcase } from "#src/design-system/sections/components/form-footer-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/form-footer",
  });
}

export default function FormFooterPage() {
  return (
    <DocPage
      path="/design-system/components/form-footer"
      description={t({
        en: "The actions of a form, such as Cancel and Save, at the end of the line under the fields, and in view while a long form scrolls.",
        zh: "表单的操作，例如「取消」与「保存」，位于字段下方那一行的末尾，长表单滚动时仍保持可见。",
      })}
    >
      <FormFooterShowcase />
    </DocPage>
  );
}
