import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { BadgeLab } from "#src/design-system/lab/badge-lab.tsx";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/badge",
    view: "lab",
    title: t({ en: "Badge Lab", zh: "Badge 实验室" }),
  });
}

export default function BadgeLabPage() {
  return (
    <LabPage>
      <BadgeLab />
    </LabPage>
  );
}
