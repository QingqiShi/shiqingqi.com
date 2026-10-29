import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { ButtonLab } from "#src/design-system/lab/button-lab.tsx";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
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
