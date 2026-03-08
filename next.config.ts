import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.VERCEL ? ".next" : process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    optimizePackageImports: ["framer-motion"]
  },
  outputFileTracingRoot: __dirname
};

export default nextConfig;
