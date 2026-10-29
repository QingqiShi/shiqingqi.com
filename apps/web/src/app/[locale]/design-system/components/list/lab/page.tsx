import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { ListLab } from "#src/design-system/lab/list-lab.tsx";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/list",
    view: "lab",
    title: t({ en: "List Lab", zh: "List 实验室" }),
  });
}

export default function ListLabPage() {
  return (
    <LabPage>
      <ListLab />
    </LabPage>
  );
}
