import type { SupportedLocale } from "@/types";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale; type: string; id: string }>;
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}
