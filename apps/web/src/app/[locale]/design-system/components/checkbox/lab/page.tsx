import type { PageProps } from "@tuja/i18n/types";
import { CheckboxLab } from "#src/design-system/lab/checkbox-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/checkbox");
}

export default function CheckboxLabPage() {
  return <LabPage lab={CheckboxLab} />;
}
