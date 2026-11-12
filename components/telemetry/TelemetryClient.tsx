"use client";

import { useEffect } from "react";

export const TelemetryClient = () => {
  useEffect(() => {
    let active = true;

    // Dynamically load browser OTel after mount so it stays out of the pre-hydration root bundle
    void import("@/lib/browser-telemetry")
      .then((mod) => {
        if (active) {
          mod.initializeBrowserTelemetry();
        }
      })
      .catch(() => {
        // Ignore non-critical telemetry load failures
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
};
