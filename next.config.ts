import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Derive the PayGlobe image host from the configured API URL so remote product
// images load through next/image in every environment.
const payglobeHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || "https://api.payglobe.net"
    ).hostname;
  } catch {
    return "api.payglobe.net";
  }
})();

// Extra hosts can be supplied as a comma-separated list (e.g. a CDN or bucket).
const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const imageHosts = Array.from(
  new Set([payglobeHost, "storage.googleapis.com", ...extraHosts])
);

/**
 * A strict-but-workable CSP. 'unsafe-inline' on script-src is required because
 * Next.js bootstraps hydration with inline scripts; there is no remote script,
 * connect or frame source this site legitimately uses, so everything else locks
 * to 'self' or 'none'. Applied in production only - the dev server needs eval
 * and HMR websockets the policy would block.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Produces a minimal server bundle for Docker / Cloud Run (see Dockerfile).
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProd
            ? [
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
                { key: "Content-Security-Policy", value: contentSecurityPolicy },
              ]
            : []),
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      ...imageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
      // Wildcard for any PayGlobe subdomain (media/CDN subdomains).
      { protocol: "https" as const, hostname: "**.payglobe.net" },
    ],
  },
};

export default nextConfig;
