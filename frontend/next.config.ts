import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Hide the floating Next.js development indicator so it never bleeds into
  // screenshots or production-like demo captures.
  devIndicators: false,
};

export default nextConfig;
