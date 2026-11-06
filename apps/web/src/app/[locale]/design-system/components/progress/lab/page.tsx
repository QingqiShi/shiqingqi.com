import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { ProgressLab } from "#src/design-system/lab/progress-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/progress");
}

export default function ProgressLabPage() {
  return <LabPage lab={ProgressLab} />;
}
