'use strict'
import type { NextConfig } from 'next'
const nrExternals = require('newrelic/load-externals')

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true, // Helps identify potential problems in your app
  output: 'standalone', // Optimize for containerized environments (e.g., Docker)
  compress: true, // Enable gzip compression for better performance
  eslint: {
    dirs: ['app'],
  },
  typescript: {
    ignoreBuildErrors: false, // Ensure TypeScript errors block production builds
  },
  serverExternalPackages: ['newrelic'],
  webpack: (config) => {
    nrExternals(config)
    return config
  },
}

export default nextConfig
