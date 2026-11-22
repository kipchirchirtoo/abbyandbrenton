/** @type {import('next').NextConfig} */

// Pages that carry a personal invitation token or admin data must never be
// cached, indexed, or leak their URL to third parties (maps, fonts) via Referer.
const privateHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/invite/:path*', headers: privateHeaders },
      { source: '/invitation/:path*', headers: privateHeaders },
      { source: '/v/:path*', headers: privateHeaders },
      { source: '/admin/:path*', headers: [...privateHeaders, { key: 'X-Frame-Options', value: 'DENY' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // The wedding-day scanner needs the camera, on the admin screens only. (Later rules win for the same header.)
      { source: '/admin/:path*', headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' }] },
    ];
  },
};

export default nextConfig;
