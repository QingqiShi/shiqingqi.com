import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SliderLab } from "#src/design-system/lab/slider-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/slider");
}

export default function SliderLabPage() {
  return <LabPage lab={SliderLab} />;
}
