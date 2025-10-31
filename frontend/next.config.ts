import type { NextConfig } from "next";

const env = process.env.NODE_ENV;

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  basePath:
    env === "development" ? "" : env === "production" ? "/prod" : "/staging",
  assetPrefix:
    env === "development" ? "" : env === "production" ? "/prod/" : "/staging/",
};

export default nextConfig;
