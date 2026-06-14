import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Required on Next 14 so src/instrumentation.ts (Sentry init) runs.
    instrumentationHook: true,
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  // Image configuration for external images
  images: {
    // Serve modern formats (smaller than JPEG/PNG) when the browser supports them.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth profile images
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", // Supabase storage
      },
    ],
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// Wrap with Sentry. With no auth token at build time we skip source-map upload
// entirely, so the build never fails for lack of Sentry credentials — error
// monitoring still works once SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN are set.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
});
