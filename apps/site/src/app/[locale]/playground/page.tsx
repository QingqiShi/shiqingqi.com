import type { Metadata } from "next";
import { PlaygroundCanvas } from "#src/components/playground/playground-canvas.tsx";

// This route is intentionally unlinked (see PR #2029) — keep it out of search
// engines, AI crawlers, and social preview caches. Robots-meta is the right
// mechanism here; adding a bare `Disallow: /playground` to robots.txt would
// announce the URL to anyone who reads it, defeating the "secret" intent.
export const metadata: Metadata = {
  title: "Playground",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PlaygroundCanvas />;
}
