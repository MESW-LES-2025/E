import type { NextConfig } from "next";

// If required to build locally, run with: "NODE_ENV=staging npm run build"
const env = process.env.NODE_ENV;

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  basePath:
    env === "development"
      ? ""
      : env === "production"
        ? "/E/production"
        : "/E/staging",
  assetPrefix:
    env === "development"
      ? ""
      : env === "production"
        ? "/E/production"
        : "/E/staging",
  distDir:
    env === "development"
      ? "out"
      : env === "production"
        ? "out/production"
        : "out/staging",
};

export default nextConfig;
