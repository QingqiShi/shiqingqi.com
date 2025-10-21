/**
 * Theme utilities for Tailwind dark mode
 */

export function getDocumentClassName(theme?: string | null) {
  switch (theme) {
    case "dark": {
      return "dark";
    }
    case "light": {
      return "";
    }
    default: {
      // System theme - no class (handled by media query in CSS)
      return "";
    }
  }
}
