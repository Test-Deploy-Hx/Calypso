import { format } from "node:util";
import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  ROOT_CONTEXT,
  trace,
} from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPLogExporter as OTLPProtoLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  registerOTel,
  OTLPHttpJsonTraceExporter,
  OTLPHttpProtoTraceExporter,
} from "@vercel/otel";

const registered = Symbol.for("Calypso.telemetry");

export function registerTelemetry() {
  if (globalThis[registered]) return;

  const signozKey = process.env.SIGNOZ_INGESTION_KEY;
  const datadogKey = process.env.DD_API_KEY;
  const signozHeaders = { "signoz-ingestion-key": signozKey };
  const logRecordProcessors = [];
  const spanProcessors = [];

  if (signozKey) {
    spanProcessors.push(
      new BatchSpanProcessor(
        new OTLPHttpJsonTraceExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
            "https://ingest.us2.signoz.cloud:443/v1/traces",
          headers: signozHeaders,
        }),
      ),
    );
    logRecordProcessors.push(
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ||
            "https://ingest.us2.signoz.cloud:443/v1/logs",
          headers: signozHeaders,
        }),
      }),
    );
  }

  if (datadogKey) {
    spanProcessors.push(
      new BatchSpanProcessor(
        new OTLPHttpProtoTraceExporter({
          url:
            process.env.DD_TRACES_OTLP_ENDPOINT ||
            "https://otlp.datadoghq.com/v1/traces",
          headers: {
            "dd-api-key": datadogKey,
            // Enable the trace metrics used by Datadog's APM service views.
            compute_stats: "true",
          },
        }),
      ),
    );
    logRecordProcessors.push(
      new BatchLogRecordProcessor({
        exporter: new OTLPProtoLogExporter({
          url:
            process.env.DD_LOGS_OTLP_ENDPOINT ||
            "https://otlp.datadoghq.com/v1/logs",
          headers: { "dd-api-key": datadogKey },
        }),
      }),
    );
  }

  // SDK diagnostics use the original console methods, avoiding export loops.
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  spanProcessors.push({
    onStart() {},
    onEnd(span) {
      // Only the outer Next.js request span has the final response status.
      if (span.attributes["next.span_type"] !== "BaseServer.handleRequest") return;

      const method = span.attributes["http.method"];
      const path = span.attributes["http.target"].split("?")[0];
      const status = span.attributes["http.status_code"];
      const durationMs = Math.round(span.duration[0] * 1000 + span.duration[1] / 1e6);

      logs.getLogger("Calypso.requests").emit({
        severityNumber: SeverityNumber.INFO,
        severityText: "INFO",
        body: `${method} ${path} ${status} in ${durationMs}ms`,
        timestamp: span.endTime,
        context: trace.setSpanContext(ROOT_CONTEXT, span.spanContext()),
        attributes: {
          "http.request.method": method,
          "url.path": path,
          "http.response.status_code": status,
          duration_ms: durationMs,
        },
      });
    },
    async forceFlush() {},
    async shutdown() {},
  });

  registerOTel({
    serviceName: "Calypso",
    attributes: {
      "deployment.environment.name": "development",
    },
    // Explicit processors avoid an extra exporter from the OTEL environment.
    spanProcessors,
    logRecordProcessors,
  });

  const logger = logs.getLogger("Calypso.console");
  const levels = {
    log: "INFO",
    info: "INFO",
    warn: "WARN",
    error: "ERROR",
    debug: "DEBUG",
  };

  for (const [method, severityText] of Object.entries(levels)) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      original(...args);
      logger.emit({
        severityNumber: SeverityNumber[severityText],
        severityText,
        body: format(...args),
      });
    };
  }

  globalThis[registered] = true;
  const destinations = [signozKey && "SigNoz", datadogKey && "Datadog"].filter(Boolean);
  console.info(`[Telemetry] Server log and trace export initialized: ${destinations.join(", ")}.`);
}
