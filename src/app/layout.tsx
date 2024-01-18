import "./global.css";

/**
 * Only purpose of this file is to load the `global.css` file.
 * At the moment stylex requires at least one css file to be imported. Additionally We want the css to
 * be above the `[locale]` layout so that it doesn't need to be redownloaded, when locale changes.
 */
export default function Layout({ children }: React.PropsWithChildren<object>) {
  return children;
}
