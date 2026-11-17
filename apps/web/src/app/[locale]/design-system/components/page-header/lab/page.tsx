import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { PageHeaderLab } from "#src/design-system/lab/page-header-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/page-header");
}

export default function PageHeaderLabPage() {
  return <LabPage lab={PageHeaderLab} />;
}
