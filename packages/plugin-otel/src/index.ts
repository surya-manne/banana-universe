import 'reflect-metadata'

interface AppContext {
  app: { use(path: unknown, ...handlers: unknown[]): unknown }
  logger?: { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
  container?: unknown
}

export interface OtelPluginOptions {
  serviceName: string
  /** OTLP HTTP endpoint, e.g. 'http://localhost:4318/v1/traces' */
  exporterUrl?: string
}

export function OpenTelemetryPlugin(options: OtelPluginOptions): {
  name: string
  register(ctx: AppContext): Promise<void>
  onShutdown(): Promise<void>
} {
  let sdk: { shutdown(): Promise<void> } | undefined

  return {
    name: 'OpenTelemetryPlugin',

    async register(ctx): Promise<void> {
      try {
        const [sdkModule, autoInstrModule] = await Promise.all([
          import('@opentelemetry/sdk-node'),
          import('@opentelemetry/auto-instrumentations-node'),
        ])

        const { NodeSDK } = sdkModule
        const { getNodeAutoInstrumentations } = autoInstrModule

        let traceExporter: unknown
        if (options.exporterUrl) {
          try {
            const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
            traceExporter = new OTLPTraceExporter({ url: options.exporterUrl })
          } catch {
            ctx.logger?.warn(
              'OpenTelemetryPlugin: @opentelemetry/exporter-trace-otlp-http not installed — using default console exporter',
            )
          }
        }

        const sdkConfig: Record<string, unknown> = {
          serviceName: options.serviceName,
          instrumentations: [getNodeAutoInstrumentations()],
        }
        if (traceExporter) {
          sdkConfig['traceExporter'] = traceExporter
        }

        const nodeSdk = new NodeSDK(sdkConfig)
        nodeSdk.start()
        sdk = nodeSdk

        ctx.logger?.info(`OpenTelemetryPlugin: SDK started for service "${options.serviceName}"`)

        // Import only `trace` — no unused imports
        const { trace } = await import('@opentelemetry/api')

        // Mount span attribute middleware while in register(), before routes are registered.
        // Positioning here is critical: onReady() fires after initializeControllers(), too late.
        ctx.app.use((_req: unknown, _res: unknown, next: unknown) => {
          const req = _req as { requestId?: string; headers?: Record<string, string> }
          const span = trace.getActiveSpan()
          if (span) {
            const requestId = req.requestId ?? req.headers?.['x-request-id'] ?? 'unknown'
            span.setAttribute('request.id', requestId)
          }
          ;(next as (err?: unknown) => void)()
        })
      } catch (err) {
        ctx.logger?.warn(
          `OpenTelemetryPlugin: Failed to initialize — ${String(err)}. Tracing disabled.`,
        )
      }
    },

    async onShutdown(): Promise<void> {
      if (sdk) {
        try {
          await sdk.shutdown()
        } catch {
          // ignore shutdown errors — process is exiting
        } finally {
          sdk = undefined
        }
      }
    },
  }
}
