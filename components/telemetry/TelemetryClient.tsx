"use client";

import { useEffect } from "react";

export const TelemetryClient = () => {
  useEffect(() => {
    // Dynamically import client instrumentation only in browser runtime
    void import("@/instrumentation-client");
  }, []);

  return null;
};
