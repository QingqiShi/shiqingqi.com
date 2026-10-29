import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { LabPage } from "#src/design-system/lab/lab-page.tsx";
import { ToastLab } from "#src/design-system/lab/toast-lab.tsx";
import { designSystemMetadata } from "../../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/toast",
    view: "lab",
    title: t({ en: "Toast Lab", zh: "Toast 实验室" }),
  });
}

export default function ToastLabPage() {
  return (
    <LabPage>
      <ToastLab />
    </LabPage>
  );
}
