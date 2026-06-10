import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.nextvibe.io",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://api.nextvibe.io/api/v1/:path*/",
      },
    ];
  },
};

export default nextConfig;
