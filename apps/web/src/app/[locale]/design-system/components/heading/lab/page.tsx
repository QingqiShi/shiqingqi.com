import type { PageProps } from "@tuja/i18n/types";
import { HeadingLab } from "#src/design-system/lab/heading-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/heading");
}

export default function HeadingLabPage() {
  return <LabPage lab={HeadingLab} />;
}
