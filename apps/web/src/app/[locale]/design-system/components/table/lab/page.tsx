import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { TableLab } from "#src/design-system/lab/table-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/table");
}

export default function TableLabPage() {
  return <LabPage lab={TableLab} />;
}
