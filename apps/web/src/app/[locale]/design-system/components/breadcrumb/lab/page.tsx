import type { PageProps } from "@tuja/i18n/types";
import { BreadcrumbLab } from "#src/design-system/lab/breadcrumb-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/breadcrumb");
}

export default function BreadcrumbLabPage() {
  return <LabPage lab={BreadcrumbLab} />;
}
