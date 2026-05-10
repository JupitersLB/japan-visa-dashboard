'use strict'
import { createRequire } from 'module'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import type { NextConfig } from 'next'

const require = createRequire(import.meta.url)
const nrExternals = require('newrelic/load-externals')
const rootDir = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true, // Helps identify potential problems in your app
  output: 'standalone', // Optimize for containerized environments (e.g., Docker)
  outputFileTracingRoot: rootDir,
  compress: true, // Enable gzip compression for better performance
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
