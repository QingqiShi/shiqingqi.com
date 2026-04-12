import type { Metadata } from "next";
import { headers } from "next/headers";
import { validateLocale } from "#src/utils/validate-locale.ts";
import Layout from "./[locale]/(home)/layout";
import RootLayout from "./[locale]/layout";

export const metadata: Metadata = {
  title: "404 | Qingqi Shi",
  description: "You're looking for a page about Qingqi Shi that doesn't exist.",
};

const translations = {
  en: "Page not found 😢",
  zh: "页面未找到 😢",
};

export default async function NotFound() {
  const locale = validateLocale((await headers()).get("x-locale") ?? "");

  return (
    <RootLayout params={Promise.resolve({ locale })}>
      <Layout params={Promise.resolve({ locale })}>
        <h1>404</h1>
        <p>{translations[locale]}</p>
      </Layout>
    </RootLayout>
  );
}
