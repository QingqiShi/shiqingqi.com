import type { Metadata } from "next";
import { ButtonLab } from "#src/design-system/lab/button-lab.tsx";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/button",
    view: "lab",
    title: t({ en: "Button Lab", zh: "Button 实验室" }),
  });
}

export default function ButtonLabPage() {
  return (
    <LabPage>
      <ButtonLab />
    </LabPage>
  );
}
