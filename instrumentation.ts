type LogRecord = {
  body: string;
  severityText: 'INFO';
  attributes: Record<string, string | number | boolean>;
};

type PostHogLogger = {
  emit(record: LogRecord): void;
};

type PostHogLoggerProvider = {
  getLogger(name: string): PostHogLogger;
  forceFlush(): Promise<void>;
};

let loggerProvider: PostHogLoggerProvider | undefined;
let checkoutLogger: PostHogLogger | undefined;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!token || !host) {
    if (process.env.NODE_ENV !== 'production') {
      if (!token) {
        console.warn(
          'NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured',
        );
      }
      if (!host) {
        console.warn(
          'NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured',
        );
      }
    }
    return;
  }

  const [{LoggerProvider, BatchLogRecordProcessor}, {OTLPLogExporter}, {resourceFromAttributes}] = await Promise.all([
    import('@opentelemetry/sdk-logs'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/resources'),
  ]);

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({'service.name': 'ecombio-headless'}),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, '')}/i/v1/logs`,
          timeoutMillis: 2000,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      }),
    ],
  });
  checkoutLogger = loggerProvider.getLogger('posthog-checkout-session');
}

export function logCheckoutSession(message: string, attributes: LogRecord['attributes']) {
  checkoutLogger?.emit({body: message, severityText: 'INFO', attributes});
}

export function flushPostHogLogs() {
  return loggerProvider?.forceFlush().catch(() => {});
}
