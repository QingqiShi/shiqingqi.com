import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SegmentedControlLab } from "#src/design-system/lab/segmented-control-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/segmented-control");
}

export default function SegmentedControlLabPage() {
  return <LabPage lab={SegmentedControlLab} />;
}
