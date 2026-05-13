import { registerOTel } from "@vercel/otel";

import { observabilityAttributes } from "@/lib/observability-schema";

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