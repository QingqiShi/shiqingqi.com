import type { SupportedLocale } from "@/types";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale; id: string }>;
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}
