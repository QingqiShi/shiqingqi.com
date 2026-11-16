import { notFound } from "next/navigation";

// A path that matches no route still renders inside the locale layout.
export default function MissingPage() {
  notFound();
}
