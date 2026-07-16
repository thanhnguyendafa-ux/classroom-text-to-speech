export function resolveAllowedOrigin(requestOrigin: unknown, configuredOrigin = process.env.ALLOWED_ORIGIN): string | null {
  if (typeof requestOrigin !== 'string' || !requestOrigin) return null;
  if (!configuredOrigin) return null;
  const allowed = configuredOrigin.split(',').map(value => value.trim()).filter(Boolean);
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function buildContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  ].join('; ');
}

interface SecurityHeaderRequest {
  headers?: { origin?: string | string[] };
}

interface SecurityHeaderResponse {
  setHeader(name: string, value: string): void;
}

export function applySecurityHeaders(req: SecurityHeaderRequest, res: SecurityHeaderResponse, methods: string): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy-Report-Only', buildContentSecurityPolicy());
  const origin = resolveAllowedOrigin(req?.headers?.origin);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
