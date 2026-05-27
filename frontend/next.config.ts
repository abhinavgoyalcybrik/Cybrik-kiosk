import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["nimbly-acuteness-zips.ngrok-free.dev"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "t0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t1.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t2.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t3.gstatic.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8003/api/:path*/",
      },
    ];
  },
};

export default nextConfig;
