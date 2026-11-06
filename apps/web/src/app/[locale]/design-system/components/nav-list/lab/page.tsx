import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { NavListLab } from "#src/design-system/lab/nav-list-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/nav-list");
}

export default function NavListLabPage() {
  return <LabPage lab={NavListLab} />;
}
