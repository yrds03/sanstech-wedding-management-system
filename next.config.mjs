/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@electric-sql/pglite'],
  webpack(config, {dev}) {
    if (dev) {
      // Runtime JSON and browser artifacts must not trigger a source reload
      // during a form submission or an upload in the local test environment.
      const ignored = config.watchOptions?.ignored;
      const runtimePaths = /(?:^|[\\/])(?:\.local-data|test-results|playwright-report)(?:[\\/]|$)/;
      config.watchOptions = {...config.watchOptions, ignored: ignored instanceof RegExp
        ? new RegExp(`(?:${ignored.source})|(?:${runtimePaths.source})`, ignored.flags)
        : [...(Array.isArray(ignored) ? ignored : ignored ? [ignored] : []), '**/.local-data', '**/.local-data/**', '**/test-results', '**/test-results/**', '**/playwright-report', '**/playwright-report/**']};
    }
    return config;
  },
  outputFileTracingIncludes: {'/*': ['./database/**/*.sql', './node_modules/@electric-sql/pglite/dist/*']},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self'${process.env.NODE_ENV === 'development' ? ' ws: http://localhost:* http://127.0.0.1:*' : ''}; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://script.google.com https://script.googleusercontent.com; object-src 'none';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;


