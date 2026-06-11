import type { NextConfig } from 'next';

const apiHost = process.env.API_HOST ?? 'localhost';
const apiPort = process.env.API_PORT ?? '3002';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://${apiHost}:${apiPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
