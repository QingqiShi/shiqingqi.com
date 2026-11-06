import type { PageProps } from "@tuja/i18n/types";
import { DividerLab } from "#src/design-system/lab/divider-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/divider");
}

export default function DividerLabPage() {
  return <LabPage lab={DividerLab} />;
}
