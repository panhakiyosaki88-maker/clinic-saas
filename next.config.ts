import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions are stable in Next 15; tune the allowed body size for file metadata payloads.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
