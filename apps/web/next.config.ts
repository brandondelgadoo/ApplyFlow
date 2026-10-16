import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Our shared package ships plain TypeScript, so Next.js needs to compile it.
  transpilePackages: ["@applyflow/shared"],
};

export default nextConfig;
