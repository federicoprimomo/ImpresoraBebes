import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1mb — muy poco para un PDF de entrada escaneado.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
