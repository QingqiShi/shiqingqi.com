import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SectionLab } from "#src/design-system/lab/section-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/section");
}

export default function SectionLabPage() {
  return <LabPage lab={SectionLab} />;
}
