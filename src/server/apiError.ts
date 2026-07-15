import { logger } from './structuredLogger';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = 'ApiError';
  }
}

export function normalizeApiError(error: unknown): {
  status: number;
  body: { code: string; error: string };
  logCode: string;
} {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { code: error.code, error: error.publicMessage },
      logCode: error.code,
    };
  }

  return {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      error: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.',
    },
    logCode: 'INTERNAL_ERROR',
  };
}

export function sendApiError(
  response: { status(code: number): { json(body: unknown): unknown } },
  error: unknown,
  context: string,
) {
  const normalized = normalizeApiError(error);
  logger.error('api_request_failed', { context, code: normalized.logCode, status: normalized.status });
  response.status(normalized.status).json(normalized.body);
}
