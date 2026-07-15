export type LogLevel = 'info' | 'warn' | 'error';

type LoggerSink = (line: string) => void;
const sensitiveKey = /(api.?key|token|authorization|secret|password|email)/i;

function sanitize(value: unknown, key = ''): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (value instanceof Error) return { name: value.name, message: sanitize(value.message) };
  if (Array.isArray(value)) return value.map(item => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey)]));
  }
  if (typeof value === 'string' && /(AIza|Bearers|sk-[A-Za-z0-9])/i.test(value)) return '[REDACTED]';
  return value;
}

export function createStructuredLogger(sinks: Partial<Record<LogLevel, LoggerSink>> = {}) {
  const emit = (level: LogLevel, event: string, context: Record<string, unknown> = {}) => {
    const payload = { timestamp: new Date().toISOString(), level, event, ...sanitize(context) as Record<string, unknown> };
    const line = JSON.stringify(payload);
    (sinks[level] ?? (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log))(line);
  };
  return {
    info: (event: string, context?: Record<string, unknown>) => emit('info', event, context),
    warn: (event: string, context?: Record<string, unknown>) => emit('warn', event, context),
    error: (event: string, context?: Record<string, unknown>) => emit('error', event, context),
  };
}

export const logger = createStructuredLogger();
