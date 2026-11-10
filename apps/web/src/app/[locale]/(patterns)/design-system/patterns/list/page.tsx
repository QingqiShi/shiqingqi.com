import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { ListScreen } from "#src/design-system/patterns/list/list-screen.tsx";
import { patternMetadata } from "#src/design-system/patterns/pattern-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return patternMetadata(
    validateLocale(locale),
    "/design-system/patterns/list",
  );
}

export default function ListPatternPage() {
  return <ListScreen />;
}
