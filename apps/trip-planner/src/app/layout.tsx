import "./globals.css";

/**
 * Loads `globals.css` above the `[locale]` layout, so the stylesheet stays
 * when the locale changes.
 */
export default function Layout({ children }: React.PropsWithChildren<object>) {
  return children;
}
