import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["unpdf", "mammoth"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
