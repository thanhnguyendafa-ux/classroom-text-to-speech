import { ApiError } from './apiError';
import { adminAuth } from './firebaseAdmin';
import { getClientIp } from './rateLimiter';

interface IdentityRequest {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
  ip?: string;
}

export async function resolveRateLimitIdentity(
  request: IdentityRequest,
  verifyIdToken: (token: string) => Promise<{ uid?: string }>,
): Promise<string> {
  const authorization = request.headers?.authorization;

  if (authorization === undefined) {
    return `ip:${getClientIp(request)}`;
  }

  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập không hợp lệ.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập không hợp lệ.');
  }

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded.uid) {
      throw new Error('Missing uid');
    }
    return `user:${decoded.uid}`;
  } catch {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
  }
}

export function getRequestRateLimitIdentity(request: IdentityRequest) {
  return resolveRateLimitIdentity(request, (token) => adminAuth.verifyIdToken(token));
}
