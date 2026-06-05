const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Корень трассировки — папка frontend (не родительский mvp с вторым lockfile)
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
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
