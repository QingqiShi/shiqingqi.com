import { notFound } from "next/navigation";

// App Router sends a path that matches no route to the root 404, which is
// outside `[locale]` and has no locale. This route keeps such a path in
// `[locale]`, so that the 404 screen shows in the language of the visitor.
export default function MissingPage() {
  notFound();
}
