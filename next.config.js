/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: config => {
    config.resolve.fallback = { fs: false };
    config.experiments = { asyncWebAssembly: true, layers: true };
    config.module.rules.push({
      include: /scripts/,
      use: {
        loader: "null-loader"
      }
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;