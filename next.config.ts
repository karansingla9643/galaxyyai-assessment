// @ts-check
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.transloadit.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  serverExternalPackages: [
    "@trigger.dev/sdk",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "sharp",
  ],
};

export default nextConfig;
