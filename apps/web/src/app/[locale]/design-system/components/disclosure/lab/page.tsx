import type { PageProps } from "@tuja/i18n/types";
import { DisclosureLab } from "#src/design-system/lab/disclosure-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/disclosure");
}

export default function DisclosureLabPage() {
  return <LabPage lab={DisclosureLab} />;
}
