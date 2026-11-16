import "./globals.css";
import "./stylex.css";

/**
 * Loads the stylesheets above the `[locale]` layout, so they stay when the
 * locale changes.
 */
export default function Layout({ children }: React.PropsWithChildren<object>) {
  return children;
}
