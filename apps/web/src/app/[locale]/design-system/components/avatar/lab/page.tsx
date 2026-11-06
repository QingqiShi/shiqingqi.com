import type { PageProps } from "@tuja/i18n/types";
import { AvatarLab } from "#src/design-system/lab/avatar-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/avatar");
}

export default function AvatarLabPage() {
  return <LabPage lab={AvatarLab} />;
}
