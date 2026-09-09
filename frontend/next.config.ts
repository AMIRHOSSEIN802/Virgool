import type { NextConfig } from 'next';

/**
 * Backend origin. Localhost:3000 by default (development); override with
 * BACKEND_ORIGIN in production so the API proxy and image optimizer follow
 * the deployed backend without code changes.
 */
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3000';
const backendUrl = new URL(backendOrigin);

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: backendUrl.hostname,
        ...(backendUrl.port ? { port: backendUrl.port } : {}),
      },
    ],
    // Local development legitimately optimizes images from 127.0.0.1/localhost.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
