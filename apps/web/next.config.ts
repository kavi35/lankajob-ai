import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Monorepo: lockfile lives at repo root when Railway builds with workspace
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
