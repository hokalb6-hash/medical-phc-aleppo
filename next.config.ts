import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  devIndicators: false,
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
