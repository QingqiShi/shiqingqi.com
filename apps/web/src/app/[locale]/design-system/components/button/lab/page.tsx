import type { PageProps } from "@tuja/i18n/types";
import { ButtonLab } from "#src/design-system/lab/button-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/button");
}

export default function ButtonLabPage() {
  return <LabPage lab={ButtonLab} />;
}
