import type { Metadata } from "next";
import { Anchor } from "../server-components/anchor";
import Layout from "./[locale]/layout";

export const metadata: Metadata = {
  title: "404 | Qingqi Shi",
  description: "You're looking for a page about Qingqi Shi that doesn't exist.",
};

export default async function NotFound() {
  return (
    <Layout params={{ locale: "en" }}>
      <h1>404 Page not found 😢</h1>
      <Anchor href="/">Navigate to home page</Anchor>
    </Layout>
  );
}
