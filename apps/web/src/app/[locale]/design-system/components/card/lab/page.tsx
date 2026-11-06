import type { PageProps } from "@tuja/i18n/types";
import { CardLab } from "#src/design-system/lab/card-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/card");
}

export default function CardLabPage() {
  return <LabPage lab={CardLab} />;
}
