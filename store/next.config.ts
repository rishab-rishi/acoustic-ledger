import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * No nonce. Next can only inject a CSP nonce during server-side rendering, so
 * a nonce-based policy requires every matched page to render dynamically —
 * that would undo Phase 5's catalog caching (see CLAUDE-CODE-TASKS.md §5.2).
 * `'unsafe-inline'` is the trade-off that keeps the PayPal SDK's injected
 * script/style and Next's RSC hydration payload working on pages the CDN
 * caches. It does weaken the policy against injected-script XSS; the other
 * directives (frame-ancestors, object-src, base-uri, form-action) are what
 * still carry real weight here.
 *
 * React's dev-mode error reconstruction needs `'unsafe-eval'`; production
 * React/Next don't use `eval`, so it's dropped outside development.
 */
const cspDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com https://www.sandbox.paypal.com${
    isProd ? "" : " 'unsafe-eval'"
  }`,
  `style-src 'self' 'unsafe-inline' https://www.paypalobjects.com`,
  `img-src 'self' data: blob: https://www.paypalobjects.com https://*.paypal.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.paypal.com https://*.paypalobjects.com`,
  `frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // Also stops the storefront being iframed into someone else's page —
  // X-Frame-Options: DENY below is the same protection for older browsers.
  `frame-ancestors 'none'`,
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

/**
 * Ships Report-Only until CSP_ENFORCE=1 is set. Flip it only after watching a
 * full add-to-cart -> PayPal sandbox checkout -> confirmation flow in a real
 * browser's console with zero violations — see SECURITY.md. A CSP that blocks
 * PayPal's popup/iframe silently kills payments; Report-Only never blocks
 * anything, it only reports what enforcing would have blocked.
 */
const cspHeaderName =
  process.env.CSP_ENFORCE === "1"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: cspHeaderName, value: cspDirectives },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Every route — the API handlers need X-Content-Type-Options and
        // frame-ancestors just as much as the pages do.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
