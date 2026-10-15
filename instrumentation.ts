import { registerOTel } from "@vercel/otel";

import { observabilityAttributes } from "@/lib/observability-schema";

import type { Instrumentation } from "next";

const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || "receipt-ai-frontend";

export function register() {
    registerOTel({
        serviceName,
        attributes: {
            [observabilityAttributes.appName]: "receipt-ai",
            [observabilityAttributes.appRuntime]: "nextjs",
        },
    });
}

export const onRequestError: Instrumentation.onRequestError = async (
    err,
    request,
    context,
) => {
    if (process.env.NODE_ENV !== "production") {
        console.error(
            `[Server Error] in ${context.routerKind} (${context.routePath} - ${request.method} ${request.path}):`,
            err,
        );
    }
};