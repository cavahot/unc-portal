/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // MinIO local (dev)
      { protocol: 'http', hostname: 'localhost', port: '9100', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9100', pathname: '/**' },
      // Servidor dedicado — configurar MEDIA_HOSTNAME en Vercel env vars
      ...(process.env.MEDIA_HOSTNAME
        ? [{ protocol: 'https', hostname: process.env.MEDIA_HOSTNAME, pathname: '/**' }]
        : []),
    ],
  },
};

export default nextConfig;
