import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default withNextIntl(nextConfig);
