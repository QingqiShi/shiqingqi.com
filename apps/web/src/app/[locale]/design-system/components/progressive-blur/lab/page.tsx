import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { ProgressiveBlurLab } from "#src/design-system/lab/progressive-blur-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/progressive-blur");
}

export default function ProgressiveBlurLabPage() {
  return <LabPage lab={ProgressiveBlurLab} />;
}
