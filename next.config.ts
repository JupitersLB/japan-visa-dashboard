import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true, // Helps identify potential problems in your app
  output: 'standalone', // Optimize for containerized environments (e.g., Docker)
  compress: true, // Enable gzip compression for better performance
  eslint: {
    dirs: ['app'],
  },
  typescript: {
    ignoreBuildErrors: false, // Ensure TypeScript errors block production builds
  },
}

export default nextConfig
