import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained Node.js server bundle
  // suitable for slim Docker images (no node_modules in final layer).
  output: "standalone",
};

export default nextConfig;
