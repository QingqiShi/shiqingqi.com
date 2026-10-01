import type { Metadata } from "next";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { SwitchLab } from "#src/design-system/lab/switch-lab.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/switch",
    view: "lab",
    title: t({ en: "Switch Lab", zh: "Switch 实验室" }),
  });
}

export default function SwitchLabPage() {
  return (
    <LabPage>
      <SwitchLab />
    </LabPage>
  );
}
