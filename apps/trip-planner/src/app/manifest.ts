import type { MetadataRoute } from "next";

// Installable PWA manifest so the planner can be added to a home screen and
// opened on the road without a connection (the service worker serves cached
// pages and assets).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "旅行计划",
    short_name: "旅行计划",
    description: "自驾行程：每日安排、景点、餐厅与住宿。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
