import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { permanentRedirect } from "next/navigation";

export default async function Page({ params }: PageProps) {
  permanentRedirect(
    getLocalePath("/reports", validateLocale((await params).locale)),
  );
}
