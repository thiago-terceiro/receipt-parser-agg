// app/metadata.ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Receipt Aggregator AI",
    template: "%s | Receipt Aggregator AI",
  },
  description:
    "A receipt extraction UI backed by AI Hugging Face Inference on Vercel.",

  applicationName: "Receipt Aggregator AI",
  metadataBase: new URL("https://receipt-parser-agg.vercel.app/en/"),
};
