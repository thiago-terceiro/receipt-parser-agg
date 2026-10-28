import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://receipt-parser-agg.vercel.app";

  return {
    rules: [
      // 1. Block foundation model training scrapers from consuming site data for training
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Google-Extended",
          "CCBot",
          "ByteSpider",
          "Diffbot",
        ],
        disallow: ["/"],
      },
      // 2. Allow live AI search, answer, and citation engines to index and cite pages
      {
        userAgent: [
          "OAI-SearchBot",
          "Claude-SearchBot",
          "PerplexityBot",
          "Applebot-Extended",
        ],
        allow: ["/"],
        disallow: ["/api/", "/private/"],
      },
      // 3. Default rules for general search crawlers (Googlebot, Bingbot)
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
