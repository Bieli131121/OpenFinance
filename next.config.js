/** @type {import('next').NextConfig} */

// Server Actions já só aceitam requisições cujo Origin bate com o Host (proteção CSRF
// nativa). `allowedOrigins: ['*']` DESLIGAVA essa proteção. Só liste aqui domínios
// seus que realmente precisem (ex: app atrás de proxy/domínio customizado):
//   SERVER_ACTIONS_ALLOWED_ORIGINS=app.meudominio.com.br,outro.meudominio.com.br
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? '')
  .split(',').map((o) => o.trim()).filter((o) => o && o !== '*');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
];

const nextConfig = {
  poweredByHeader: false,
  ...(allowedOrigins.length ? { experimental: { serverActions: { allowedOrigins } } } : {}),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
module.exports = nextConfig;
