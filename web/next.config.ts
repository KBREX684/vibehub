import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://avatars.githubusercontent.com https://*.githubusercontent.com",
      "font-src 'self'",
      "connect-src 'self' https://api.github.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "*.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "opengraph.githubassets.com", pathname: "/**" },
      { protocol: "https", hostname: "example.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
