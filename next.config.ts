import type { NextConfig } from "next";

/**
 * Disables ESLint during Vercel builds to prevent non-critical lint errors from blocking deployment.
 *
 * Recommended for production deployment if you already run linting locally or in CI.
 *
 * To re-enable ESLint in production builds for stricter code quality, remove or set `ignoreDuringBuilds: false`.
 */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Map libs ship modern ESM; transpiling avoids occasional webpack chunk/module id mismatches in the App Router. */
  transpilePackages: ['mapbox-gl', 'react-map-gl'],
  webpack: (config, { isServer }) => {
    // Fix MUI imports for Next.js 15 compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mui/material/esm': '@mui/material',
    };
    
    return config;
  },
};

export default nextConfig;
