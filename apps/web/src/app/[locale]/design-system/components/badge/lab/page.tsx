import type { PageProps } from "@tuja/i18n/types";
import { BadgeLab } from "#src/design-system/lab/badge-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/badge");
}

export default function BadgeLabPage() {
  return <LabPage lab={BadgeLab} />;
}
