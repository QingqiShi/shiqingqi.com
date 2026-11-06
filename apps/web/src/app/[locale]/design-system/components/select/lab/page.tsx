import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SelectLab } from "#src/design-system/lab/select-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/select");
}

export default function SelectLabPage() {
  return <LabPage lab={SelectLab} />;
}
