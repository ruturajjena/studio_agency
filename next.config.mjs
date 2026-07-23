/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM; let Next transpile it for the server bundle.
  transpilePackages: ["three"],
  webpack: (config) => {
    // Allow importing raw GLSL as strings.
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
