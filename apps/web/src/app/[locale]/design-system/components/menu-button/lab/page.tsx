import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { MenuButtonLab } from "#src/design-system/lab/menu-button-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/menu-button");
}

export default function MenuButtonLabPage() {
  return <LabPage lab={MenuButtonLab} />;
}
