import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Node-specific CV parsing dependencies out of the server bundle so
  // Turbopack can build the route that handles PDF uploads.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
