import type { LayoutProps } from "../../../types";

export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <article>{children}</article>
    </div>
  );
}
