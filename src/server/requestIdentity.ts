import { ApiError } from './apiError.js';
import { adminAuth } from './firebaseAdmin.js';
import { getClientIp } from './rateLimiter.js';

interface IdentityRequest {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
  ip?: string;
}

export interface AuthenticatedRequestIdentity {
  uid: string;
  rateLimitKey: string;
}

export async function requireAuthenticatedUser(
  request: IdentityRequest,
  verifyIdToken: (token: string) => Promise<{ uid?: string }>,
): Promise<AuthenticatedRequestIdentity> {
  const authorization = request.headers?.authorization;

  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập để sử dụng tính năng này.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập không hợp lệ.');
  }

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded.uid) throw new Error('Missing uid');
    return { uid: decoded.uid, rateLimitKey: 'user:' + decoded.uid };
  } catch {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
  }
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

export function requireRequestUser(request: IdentityRequest) {
  return requireAuthenticatedUser(request, (token) => adminAuth.verifyIdToken(token));
}
