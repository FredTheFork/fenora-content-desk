/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  // tools/selftest.mjs runs a second dev server beside the first one.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Sandboxes and tunnels proxy the dev server from another origin.
  allowedDevOrigins: ['*.e2b.app', '*.vercel.app'],
  // The rendered images live in public/media and are served straight from the
  // CDN — Instagram and Facebook fetch them from there when publishing.
  async headers() {
    return [
      {
        source: '/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
