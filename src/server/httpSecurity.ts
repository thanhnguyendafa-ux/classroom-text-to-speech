export function resolveAllowedOrigin(requestOrigin: unknown, configuredOrigin = process.env.ALLOWED_ORIGIN): string | null {
  if (typeof requestOrigin !== 'string' || !requestOrigin) return null;
  if (!configuredOrigin) return null;
  const allowed = configuredOrigin.split(',').map(value => value.trim()).filter(Boolean);
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function applySecurityHeaders(req: any, res: any, methods: string): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const origin = resolveAllowedOrigin(req?.headers?.origin);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
