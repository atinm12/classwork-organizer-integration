import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static site for GitHub Pages (see .github/workflows/pages.yml).
// Data then comes from a JSON file generated at build time instead of the live API route.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = isStatic
  ? { output: "export", basePath, trailingSlash: true }
  : {};

export default nextConfig;
