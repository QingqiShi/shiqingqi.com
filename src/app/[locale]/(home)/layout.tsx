import type { Metadata } from "next";
import type { LayoutProps } from "@/types";
import { BASE_URL } from "../../constants";

export const metadata: Metadata = {
  alternates: {
    canonical: new URL("/", BASE_URL).toString(),
    languages: {
      en: new URL("/", BASE_URL).toString(),
      zh: new URL("/zh", BASE_URL).toString(),
    },
  },
};

export default function HomeLayout({ children }: LayoutProps) {
  return children;
}
