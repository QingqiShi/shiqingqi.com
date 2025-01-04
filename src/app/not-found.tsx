import type { Metadata } from "next";
import Layout from "./[locale]/(home)/layout";
import RootLayout from "./[locale]/layout";

export const metadata: Metadata = {
  title: "404 | Qingqi Shi",
  description: "You're looking for a page about Qingqi Shi that doesn't exist.",
};

export default function NotFound() {
  return (
    <RootLayout params={Promise.resolve({ locale: "en" })}>
      <Layout params={Promise.resolve({ locale: "en" })}>
        <h1>404</h1>
        <p>Page not found 😢</p>
      </Layout>
    </RootLayout>
  );
}
