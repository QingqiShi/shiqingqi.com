import type { Metadata } from "next";
import DesignSystemOverview from "../page.tsx";

// On a narrow screen this URL shows the list of pages, and on a wide one the
// list beside the overview. The overview is the page that search engines list.
export const metadata: Metadata = { robots: { index: false } };

export default DesignSystemOverview;
