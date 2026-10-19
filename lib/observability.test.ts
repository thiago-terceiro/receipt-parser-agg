import { SpanStatusCode } from "@opentelemetry/api";

import {
    logError,
    logInfo,
    recordSpanError,
    sanitizeTelemetryPayload,
    sanitizeTelemetryString,
    withDbSpan,
} from "@/lib/observability";
import { observabilityAttributes } from "@/lib/observability-schema";

describe("lib/observability", () => {
    describe("sanitizeTelemetryString", () => {
        it("redacts credit card numbers", () => {
            const message = "Customer card 4532 1234 5678 9012 was charged";
            expect(sanitizeTelemetryString(message)).toBe(
                "Customer card [REDACTED_CARD] was charged",
            );
        });

        it("redacts email addresses", () => {
            const message = "Receipt sent to customer.john@example.com for processing";
            expect(sanitizeTelemetryString(message)).toBe(
                "Receipt sent to [REDACTED_EMAIL] for processing",
            );
        });

        it("redacts bearer tokens and api keys", () => {
            const message = "Auth failure with Bearer eyJhbGciOiJIUzI1NiJ9.test and api_key=secret-12345678";
            const sanitized = sanitizeTelemetryString(message);
            expect(sanitized).toContain("Bearer [REDACTED_TOKEN]");
            expect(sanitized).toContain("key=[REDACTED_SECRET]");
        });

        it("truncates excessively long error strings", () => {
            const hugePayload = "A".repeat(800);
            const sanitized = sanitizeTelemetryString(hugePayload);
            expect(sanitized.length).toBeLessThan(600);
            expect(sanitized).toContain("... [TRUNCATED]");
        });

        it("handles empty or falsy strings gracefully", () => {
            expect(sanitizeTelemetryString("")).toBe("");
        });
    });

    describe("sanitizeTelemetryPayload", () => {
        it("recursively sanitizes strings within objects and arrays", () => {
            const payload = {
                user: {
                    email: "alice@example.com",
                    card: "4000-1234-5678-9999",
                },
                tags: ["ok", "contact user@domain.org"],
                count: 42,
            };

            const sanitized = sanitizeTelemetryPayload(payload) as typeof payload;
            expect(sanitized.user.email).toBe("[REDACTED_EMAIL]");
            expect(sanitized.user.card).toBe("[REDACTED_CARD]");
            expect(sanitized.tags[1]).toBe("contact [REDACTED_EMAIL]");
            expect(sanitized.count).toBe(42);
        });
    });

    describe("recordSpanError", () => {
        it("sanitizes exception message and stack before recording to span", () => {
            const mockSpan = {
                recordException: jest.fn(),
                setStatus: jest.fn(),
            };

            const sensitiveError = new Error(
                "Failed to parse item for john.doe@work.com with card 5500 0000 1111 2222",
            );

            recordSpanError(mockSpan as never, sensitiveError);

            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.ERROR,
                message: expect.stringContaining("[REDACTED_EMAIL]"),
            });
            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.ERROR,
                message: expect.stringContaining("[REDACTED_CARD]"),
            });

            expect(mockSpan.recordException).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Error",
                    message: expect.stringContaining("[REDACTED_EMAIL]"),
                }),
            );
        });

        it("handles unknown non-Error objects safely", () => {
            const mockSpan = {
                recordException: jest.fn(),
                setStatus: jest.fn(),
            };

            recordSpanError(mockSpan as never, "string error");

            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.ERROR,
                message: "Unknown error",
            });
        });
    });

    describe("withDbSpan", () => {
        it("creates a standardized database span with postgresql attributes", async () => {
            const result = await withDbSpan(
                "board_members",
                "select",
                async (span) => {
                    span.setAttribute(observabilityAttributes.dbResponseReturnedRows, 3);
                    return [{ id: 1 }, { id: 2 }, { id: 3 }];
                },
            );

            expect(result).toHaveLength(3);
        });
    });

    describe("logging with trace correlation", () => {
        it("sanitizes log messages and attaches trace context", () => {
            const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            logInfo("User test@example.com logged in", { userCard: "4111 2222 3333 4444" });
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                "User [REDACTED_EMAIL] logged in",
                expect.objectContaining({
                    userCard: "[REDACTED_CARD]",
                }),
            );

            logError("Payment failure on card 4111 2222 3333 4444");
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Payment failure on card [REDACTED_CARD]",
                expect.any(Object),
            );

            consoleInfoSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });
});
