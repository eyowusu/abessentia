import type { NextConfig } from "next";

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
  new Set([
    payglobeHost,
    "api.payglobe.net",
    "storage.googleapis.com",
    ...extraHosts,
  ])
);

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
