/**
 * Next.js instrumentation entry point.
 *
 * `register()`   — boots OpenTelemetry (traces → Grafana Tempo) only when an
 *                  OTLP endpoint is configured, so local/dev stays quiet.
 * `onRequestError` — the safety net: Next.js calls this for EVERY server-side
 *                  error (RSC render, route handler, server action, proxy).
 *                  We funnel them all through the shared `logError` so each one
 *                  is captured with its route, type, and stack. See
 *                  src/lib/observability/logger.ts.
 */
import { registerOTel } from "@vercel/otel";
import type { Instrumentation } from "next";
import { logError } from "@/lib/observability/logger";

export function register() {
  // Only wire up the OTLP exporter when Grafana (or any collector) is configured.
  // Without an endpoint, errors still reach the structured stderr logs.
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME || "albosla" });
  }
}

export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  logError(err, {
    where: context.routePath || request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: (context as { renderSource?: string }).renderSource,
    method: request.method,
    path: request.path,
    digest: (err as { digest?: string }).digest,
  });
};
