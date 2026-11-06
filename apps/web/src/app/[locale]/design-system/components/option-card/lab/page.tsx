import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { OptionCardLab } from "#src/design-system/lab/option-card-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/option-card");
}

export default function OptionCardLabPage() {
  return <LabPage lab={OptionCardLab} />;
}
