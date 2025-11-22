import type { NextConfig } from "next";

// If required to build locally, run with: "NODE_ENV=development npm run build"
const env = process.env.NODE_ENV;

const nextConfig: NextConfig = {
  /* config options here */
  // Only use static export for production builds if explicitly enabled
  // For development with dynamic routes, we need runtime rendering
  ...(env === "production" && process.env.STATIC_EXPORT === "true"
    ? { output: "export" }
    : {}),
  images: { unoptimized: true },
  trailingSlash: true,
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
