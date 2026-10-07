/**
 * Product routes that render without API keys, each with the element its
 * content is under and an element that shows the route has rendered.
 */
export const PRODUCT_ROUTES = [
  { path: "/", root: ["main"], ready: "main h1" },
  { path: "/experiences/spotify", root: ["main"], ready: "main h1" },
  { path: "/movie-database", root: ["main"], ready: "main" },
  { path: "/calculator", root: ["main"], ready: "main" },
  // The landing page has no <main>, so the check starts at the page's own
  // root: the element that holds the hero section.
  {
    path: "/pixel-creature-creator",
    root: ["div:has(> section h1)"],
    ready: "h1",
  },
  { path: "/sprite-editor", root: ["main"], ready: "main" },
];
