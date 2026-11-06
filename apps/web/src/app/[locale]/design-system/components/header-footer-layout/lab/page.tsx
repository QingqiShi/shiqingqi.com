import type { PageProps } from "@tuja/i18n/types";
import { HeaderFooterLayoutLab } from "#src/design-system/lab/header-footer-layout-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/header-footer-layout");
}

export default function HeaderFooterLayoutLabPage() {
  return <LabPage lab={HeaderFooterLayoutLab} />;
}
