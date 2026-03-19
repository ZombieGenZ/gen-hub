import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/assets/GenHubv2.svg",
        destination: "/assets/Genhubv2.svg",
        permanent: false,
      },
      {
        source: "/assets/genhubv2.svg",
        destination: "/assets/Genhubv2.svg",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
