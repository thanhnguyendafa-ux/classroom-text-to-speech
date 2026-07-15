import { sanitizeLogContext } from './structuredLogger';

interface ErrorMonitorDependencies {
  endpoint: string;
  fetch: typeof fetch;
}

export function createErrorMonitor(dependencies: ErrorMonitorDependencies) {
  return {
    async report(event: string, context: Record<string, unknown> = {}): Promise<void> {
      if (!dependencies.endpoint) return;
      try {
        await dependencies.fetch(dependencies.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'classroom-text-to-speech-api',
            event,
            context: sanitizeLogContext(context),
          }),
        });
      } catch {
        // Monitoring must never break the user request path.
      }
    },
  };
}

export const errorMonitor = createErrorMonitor({
  endpoint: process.env.ERROR_MONITOR_WEBHOOK_URL?.trim() ?? '',
  fetch,
});
