/**
 * Central, provider-agnostic error logger.
 *
 * Goal: one abstract entry point — `logError(err, context)` — that captures
 * every error with enough structured detail to identify WHAT went wrong and
 * WHERE it happened, while staying safe to ship to a shared backend (PII is
 * redacted). It fans out to two sinks that both land in Grafana:
 *
 *   1. Structured JSON on stderr  → Vercel Runtime Logs → Grafana Loki
 *      (via a Vercel Log Drain), always on, no config required.
 *   2. OpenTelemetry span exception → OTLP → Grafana Tempo, active as soon as
 *      OTEL_EXPORTER_OTLP_ENDPOINT is set (see .env.local).
 *
 * Nothing here throws: logging must never break the request it is observing.
 */
import { trace, SpanStatusCode } from "@opentelemetry/api";

/** Patterns for values we never want to ship to a logging backend. */
const REDACTIONS: [RegExp, string][] = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>"],
  [/\b(?:\+?2)?01[0-25]\d{8}\b/g, "<phone>"], // Egyptian mobile numbers
  [/eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{4,}/g, "<jwt>"], // JWTs
  [/\b(?:re|sk|pk|whsec|rk)_[A-Za-z0-9_-]{8,}\b/g, "<secret>"], // Resend/Stripe-style keys
  [/(?:Bearer|Basic)\s+[A-Za-z0-9._\-+/=]{8,}/gi, "<auth>"], // auth headers
];

function redact(input: string | undefined | null): string | undefined {
  if (!input) return input ?? undefined;
  let out = input;
  for (const [re, replacement] of REDACTIONS) out = out.replace(re, replacement);
  return out;
}

/** Keep the top of the stack — that's where the "where" lives — and trim the rest. */
function topFrames(stack: string | undefined, n = 8): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split("\n");
  const trimmed = lines.slice(0, n + 1).join("\n");
  return redact(trimmed);
}

export interface ErrorContext {
  /** Logical location, e.g. "api/payments/verify-screenshot". The single most useful field. */
  where?: string;
  /** Operation being attempted, e.g. "validateReceipt" or "sendReminderEmail". */
  op?: string;
  /** Next.js request/route metadata (populated automatically by instrumentation). */
  routePath?: string;
  routeType?: string;
  routerKind?: string;
  renderSource?: string;
  method?: string;
  path?: string;
  digest?: string;
  /** Any extra low-cardinality, non-sensitive fields worth attaching. */
  extra?: Record<string, string | number | boolean | undefined>;
}

export interface ErrorRecord {
  level: "error";
  service: string;
  env: string;
  ts: string;
  name: string;
  message: string | undefined;
  where: string;
  op?: string;
  http?: { method?: string; path?: string };
  route?: { path?: string; type?: string; router?: string; renderSource?: string };
  digest?: string;
  stack?: string;
  [k: string]: unknown;
}

/**
 * Log an error to all configured sinks. Safe to call from anywhere on the
 * server (route handlers, server actions, cron jobs, instrumentation).
 */
export function logError(err: unknown, ctx: ErrorContext = {}): ErrorRecord {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const digest = ctx.digest ?? (e as { digest?: string }).digest;

  const record: ErrorRecord = {
    level: "error",
    service: process.env.OTEL_SERVICE_NAME || "albosla",
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    ts: new Date().toISOString(),
    name: e.name || "Error",
    message: redact(e.message),
    where: ctx.where ?? ctx.routePath ?? "unknown",
    op: ctx.op,
    http: ctx.method || ctx.path ? { method: ctx.method, path: redact(ctx.path) } : undefined,
    route:
      ctx.routePath || ctx.routeType || ctx.routerKind || ctx.renderSource
        ? { path: ctx.routePath, type: ctx.routeType, router: ctx.routerKind, renderSource: ctx.renderSource }
        : undefined,
    digest,
    stack: topFrames(e.stack),
  };
  if (ctx.extra) {
    for (const [k, v] of Object.entries(ctx.extra)) {
      if (v !== undefined) record[k] = typeof v === "string" ? redact(v) : v;
    }
  }

  // Sink 1 — structured stderr (always on). One JSON object per line = clean Loki ingestion.
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(record));
  } catch {
    /* never let logging throw */
  }

  // Sink 2 — attach to the active OTel span so it surfaces on the trace in Tempo.
  try {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(e);
      span.setStatus({ code: SpanStatusCode.ERROR, message: record.message });
      span.setAttributes({
        "app.error.where": record.where,
        "app.error.op": record.op ?? "",
        "app.error.name": record.name,
        "app.error.digest": record.digest ?? "",
        "app.route.type": ctx.routeType ?? "",
      });
    }
  } catch {
    /* span may be unavailable (e.g. edge without an active trace) — ignore */
  }

  return record;
}
