import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Mongoose and sharp are Node-only server dependencies.
  serverExternalPackages: ["mongoose", "sharp", "nodemailer"],
  images: {
    // Product and content images are served from MongoDB GridFS via /api/media/:id.
    localPatterns: [
      { pathname: "/api/media/**", search: "" },
      { pathname: "/brand/**", search: "" },
    ],
    qualities: [70, 80],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 400],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
