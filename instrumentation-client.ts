"use client";

import {
    HoneycombWebSDK,
    WebVitalsInstrumentation,
} from "@honeycombio/opentelemetry-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";

import { observabilityAttributes } from "@/lib/observability-schema";

declare global {
    interface Window {
        __receiptAiBrowserOtelStarted__?: boolean;
    }
}

const browserTelemetryEnabled =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED === "true";
const collectorEndpoint =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL?.trim() || "";
const browserServiceName =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME?.trim() ||
    "receipt-ai-browser";
const browserDebugMode =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_DEBUG === "true";
const browserEnabledEnvironments =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS?.trim() ||
    "preview";

const resolveRuntimeEnvironment = () => {
    const envCandidates = [
        process.env.NEXT_PUBLIC_VERCEL_ENV,
        process.env.VERCEL_ENV,
        process.env.NODE_ENV,
    ];

    for (const candidate of envCandidates) {
        const normalizedCandidate = candidate?.trim().toLowerCase();

        if (normalizedCandidate) {
            return normalizedCandidate;
        }
    }

    return "development";
};

const isTelemetryEnabledForCurrentEnvironment = () => {
    const runtimeEnvironment = resolveRuntimeEnvironment();
    const allowedEnvironments = browserEnabledEnvironments
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return allowedEnvironments.includes(runtimeEnvironment);
};

const resolveSampleRate = () => {
    const rawValue = process.env.NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE?.trim();
    const parsedValue = Number.parseInt(rawValue ?? "1", 10);

    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
};

const escapeForRegex = (value: string) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const resolveTraceHeaderCorsUrls = () => {
    if (typeof window === "undefined") {
        return [] as RegExp[];
    }

    const originPattern = escapeForRegex(window.location.origin);

    return [new RegExp(`^${originPattern}(?:/.*)?$`)];
};

const initializeBrowserTelemetry = () => {
    if (
        typeof window === "undefined" ||
        window.__receiptAiBrowserOtelStarted__ ||
        !browserTelemetryEnabled ||
        !isTelemetryEnabledForCurrentEnvironment() ||
        !collectorEndpoint
    ) {
        return;
    }

    try {
        const sdk = new HoneycombWebSDK({
            debug: browserDebugMode,
            endpoint: collectorEndpoint,
            instrumentations: [
                getWebAutoInstrumentations({
                    "@opentelemetry/instrumentation-fetch": {
                        ignoreNetworkEvents: true,
                        propagateTraceHeaderCorsUrls:
                            resolveTraceHeaderCorsUrls(),
                    },
                    "@opentelemetry/instrumentation-xml-http-request": {
                        ignoreNetworkEvents: true,
                        propagateTraceHeaderCorsUrls:
                            resolveTraceHeaderCorsUrls(),
                    },
                }),
                new WebVitalsInstrumentation(),
            ],
            resourceAttributes: {
                [observabilityAttributes.appName]: "receipt-ai",
                [observabilityAttributes.appRuntime]: "browser",
            },
            sampleRate: resolveSampleRate(),
            serviceName: browserServiceName,
            skipOptionsValidation: true,
        });

        sdk.start();
        window.__receiptAiBrowserOtelStarted__ = true;

        if (browserDebugMode) {
            console.info("Browser telemetry initialized.", {
                collectorEndpoint,
                runtimeEnvironment: resolveRuntimeEnvironment(),
                serviceName: browserServiceName,
            });
        }
    } catch (error) {
        console.warn("Browser telemetry initialization failed.", error);
    }
};

initializeBrowserTelemetry();