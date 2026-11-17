import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dashboard/auth pages are inherently per-user and dynamic; keep caching
  // semantics simple for Phase 1 rather than opting into the new
  // cache-components model before the app has a reason to need it.
  transpilePackages: ["@growthpilot/db", "@growthpilot/core"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
