import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone for the self-host Docker image: a server.js plus the
  // traced production node_modules, so the image needs no full install.
  output: "standalone",
  turbopack: {
    rules: {
      // Required so Tailwind CSS v4 is processed in CSS files.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;