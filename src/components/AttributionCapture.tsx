"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Records where this visit came from (campaign tags / referring site) on first page view. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
