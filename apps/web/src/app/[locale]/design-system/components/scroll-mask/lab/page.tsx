import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { ScrollMaskLab } from "#src/design-system/lab/scroll-mask-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/scroll-mask");
}

export default function ScrollMaskLabPage() {
  return <LabPage lab={ScrollMaskLab} />;
}
