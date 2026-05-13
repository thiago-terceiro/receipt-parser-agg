import {
    Span,
    SpanStatusCode,
    trace,
    type Attributes,
} from "@opentelemetry/api";

const tracer = trace.getTracer("receipt-ai.app");

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

export const recordSpanError = (span: Span, error: unknown) => {
    if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
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
    const payload = {
        ...fields,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
    };

    if (level === "warn") {
        console.warn(message, payload);
        return;
    }

    if (level === "error") {
        console.error(message, payload);
        return;
    }

    console.info(message, payload);
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