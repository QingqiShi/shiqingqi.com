import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { SwitchLab } from "#src/design-system/lab/switch-lab.tsx";
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
