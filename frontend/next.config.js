const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Корень трассировки — папка frontend (не родительский mvp с вторым lockfile)
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  async redirects() {
    // Мобильный UI — основное Next.js-приложение на /, без обязательного /m в URL
    return [{ source: "/m", destination: "/", permanent: false }];
  },
  async rewrites() {
    // Статика старой сборки web mobile (assets) остаётся доступна по /m/assets/*
    return [];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "C:/DumpStack.log.tmp",
          "C:/pagefile.sys",
          "C:/swapfile.sys",
          "C:/System Volume Information/**",
        ],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
