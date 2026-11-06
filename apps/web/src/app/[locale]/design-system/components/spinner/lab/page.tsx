import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SpinnerLab } from "#src/design-system/lab/spinner-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/spinner");
}

export default function SpinnerLabPage() {
  return <LabPage lab={SpinnerLab} />;
}
