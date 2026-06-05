import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read the package version once at build/dev start so the client bundle has a
// single source of truth for the app version. The version key is consumed by
// the tour storage layer to gate future "What's New" UX.
const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
) as { version?: string };

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Hide the floating Next.js development indicator so it never bleeds into
  // screenshots or production-like demo captures.
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version ?? "0.0.0",
  },
};

export default nextConfig;
