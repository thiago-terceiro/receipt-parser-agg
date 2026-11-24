"use client";

import { useEffect } from "react";

export const TelemetryClient = () => {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED === "false") {
      return;
    }

    let active = true;

    const loadTelemetry = () => {
      // Dynamically load browser OTel after mount/idle so it stays out of the pre-hydration root bundle
      void import("@/lib/browser-telemetry")
        .then((mod) => {
          if (active) {
            mod.initializeBrowserTelemetry();
          }
        })
        .catch(() => {
          // Ignore non-critical telemetry load failures
        });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(loadTelemetry);
      return () => {
        active = false;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = setTimeout(loadTelemetry, 0);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
};
