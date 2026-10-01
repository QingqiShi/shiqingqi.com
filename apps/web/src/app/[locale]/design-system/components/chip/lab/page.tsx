import type { Metadata } from "next";
import { ChipLab } from "#src/design-system/lab/chip-lab.tsx";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
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
