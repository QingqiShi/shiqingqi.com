import type { Metadata } from "next";
import { ButtonLab } from "#src/components/design-system/lab/configs/button-lab.tsx";
import { LabPage } from "#src/components/design-system/lab/lab-page.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
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
    <LabPage path="/design-system/components/button">
      <ButtonLab />
    </LabPage>
  );
}
