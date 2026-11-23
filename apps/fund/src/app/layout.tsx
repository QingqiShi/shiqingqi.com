import "./global.css";

/**
 * Loads `global.css` above the `[locale]` layout, so the stylesheet stays when
 * the locale changes.
 */
export default function Layout({ children }: React.PropsWithChildren<object>) {
  return children;
}
