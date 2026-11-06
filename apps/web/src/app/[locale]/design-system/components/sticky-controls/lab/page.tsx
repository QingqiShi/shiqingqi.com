import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { StickyControlsLab } from "#src/design-system/lab/sticky-controls-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/sticky-controls");
}

export default function StickyControlsLabPage() {
  return <LabPage lab={StickyControlsLab} />;
}
