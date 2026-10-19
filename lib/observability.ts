import {
    Span,
    SpanStatusCode,
    trace,
    type Attributes,
} from "@opentelemetry/api";

import { observabilityAttributes } from "@/lib/observability-schema";

const tracer = trace.getTracer("receipt-ai.app");

const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const BEARER_TOKEN_REGEX = /Bearer\s+[A-Za-z0-9_\-\.]+/gi;
const API_KEY_REGEX = /(?:api[-_]?key|secret|token)["']?\s*[:=]\s*["']?[\w\-]{8,}["']?/gi;
const MAX_ERROR_MESSAGE_LENGTH = 500;

export const sanitizeTelemetryString = (input: string): string => {
    if (!input) return "";

    let sanitized = input
        .replace(CREDIT_CARD_REGEX, "[REDACTED_CARD]")
        .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
        .replace(BEARER_TOKEN_REGEX, "Bearer [REDACTED_TOKEN]")
        .replace(API_KEY_REGEX, "key=[REDACTED_SECRET]");

    if (sanitized.length > MAX_ERROR_MESSAGE_LENGTH) {
        sanitized = `${sanitized.slice(0, MAX_ERROR_MESSAGE_LENGTH)}... [TRUNCATED]`;
    }

    return sanitized;
};

export const sanitizeTelemetryPayload = (data: unknown): unknown => {
    if (typeof data === "string") {
        return sanitizeTelemetryString(data);
    }
    if (Array.isArray(data)) {
        return data.map(sanitizeTelemetryPayload);
    }
    if (data && typeof data === "object") {
        const cleaned: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data)) {
            cleaned[key] = sanitizeTelemetryPayload(val);
        }
        return cleaned;
    }
    return data;
};

export const startSpan = (name: string, attributes?: Attributes) => {
    const span = tracer.startSpan(name);

    if (attributes) {
        span.setAttributes(attributes);
    }

    return span;
};

export const withSpan = async <T>(
    name: string,
    run: (span: Span) => Promise<T>,
    attributes?: Attributes,
): Promise<T> => {
    return tracer.startActiveSpan(name, async (span) => {
        if (attributes) {
            span.setAttributes(attributes);
        }

        try {
            return await run(span);
        } catch (error) {
            recordSpanError(span, error);
            throw error;
        } finally {
            span.end();
        }
    });
};

export const withDbSpan = async <T>(
    table: string,
    operation: "select" | "insert" | "update" | "delete" | "rpc",
    run: (span: Span) => Promise<T>,
    additionalAttributes?: Attributes,
): Promise<T> => {
    const spanName = `db.${table}.${operation}`;
    return withSpan(
        spanName,
        run,
        {
            [observabilityAttributes.dbSystem]: "postgresql",
            [observabilityAttributes.dbCollectionName]: table,
            [observabilityAttributes.dbOperation]: operation,
            ...additionalAttributes,
        },
    );
};

export const recordSpanError = (span: Span, error: unknown) => {
    if (error instanceof Error) {
        const sanitizedMessage = sanitizeTelemetryString(error.message);
        span.recordException({
            name: error.name,
            message: sanitizedMessage,
            stack: error.stack ? sanitizeTelemetryString(error.stack) : undefined,
        });
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: sanitizedMessage,
        });
        return;
    }

    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Unknown error",
    });
};

export const getActiveTraceContext = () => {
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    return {
        traceId: spanContext?.traceId ?? null,
        spanId: spanContext?.spanId ?? null,
    };
};

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const logWithTrace = (level: LogLevel, message: string, fields?: LogFields) => {
    const traceContext = getActiveTraceContext();
    const sanitizedMessage = sanitizeTelemetryString(message);
    const sanitizedFields = fields
        ? (sanitizeTelemetryPayload(fields) as LogFields)
        : undefined;

    const payload = {
        ...sanitizedFields,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
    };

    if (level === "warn") {
        console.warn(sanitizedMessage, payload);
        return;
    }

    if (level === "error") {
        console.error(sanitizedMessage, payload);
        return;
    }

    console.info(sanitizedMessage, payload);
};

export const logInfo = (message: string, fields?: LogFields) => {
    logWithTrace("info", message, fields);
};

export const logWarn = (message: string, fields?: LogFields) => {
    logWithTrace("warn", message, fields);
};

export const logError = (message: string, fields?: LogFields) => {
    logWithTrace("error", message, fields);
};