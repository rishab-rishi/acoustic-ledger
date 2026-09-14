import type { MetadataRoute } from "next";

/**
 * A request, not enforcement: well-behaved crawlers honor robots.txt, and
 * badly-behaved ones ignore it. This does not, and cannot, stop scraping —
 * it only asks. The one thing that actually prevents this site being
 * *embedded* elsewhere is the X-Frame-Options / frame-ancestors pair in
 * next.config.ts.
 *
 * Confirmed with the user: disallow known AI-training crawlers in addition
 * to the normal "keep crawlers out of authenticated/action routes" rules
 * every crawler gets. Real search engines (Googlebot, Bingbot, etc.) are
 * unaffected — only the AI-training user agents below are singled out.
 */
const PRIVATE_PATHS = ["/admin", "/orders", "/cart", "/checkout", "/api"];

const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "Meta-ExternalAgent",
  "PerplexityBot",
  "Diffbot",
  "cohere-ai",
  "Omgilibot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" },
    ],
  };
}
