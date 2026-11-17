import type { MetadataRoute } from "next";

// Tell polite crawlers to stay out; sign-in stops the rest.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
