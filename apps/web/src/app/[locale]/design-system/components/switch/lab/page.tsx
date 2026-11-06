import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SwitchLab } from "#src/design-system/lab/switch-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/switch");
}

export default function SwitchLabPage() {
  return <LabPage lab={SwitchLab} />;
}
