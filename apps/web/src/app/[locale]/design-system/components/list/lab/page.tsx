import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { ListLab } from "#src/design-system/lab/list-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/list");
}

export default function ListLabPage() {
  return <LabPage lab={ListLab} />;
}
