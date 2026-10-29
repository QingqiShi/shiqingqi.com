import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { ChipLab } from "#src/design-system/lab/chip-lab.tsx";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/chip",
    view: "lab",
    title: t({ en: "Chip Lab", zh: "Chip 实验室" }),
  });
}

export default function ChipLabPage() {
  return (
    <LabPage>
      <ChipLab />
    </LabPage>
  );
}
